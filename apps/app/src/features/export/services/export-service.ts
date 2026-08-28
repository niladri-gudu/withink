import "server-only";

import type { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

import { env } from "@/config/env";
import { r2 } from "@/lib/r2";
import {
  JournalService,
  type DecryptedEntry,
} from "@/features/journal/services/journal-service";
import { NotebooksService } from "@/features/notebooks/services/notebook-service";
import { LetterRepository } from "@/features/letters/repositories/letter-repository";

/**
 * Builds a complete, self-contained backup archive of a user's journal.
 *
 * The archive is organized for long-term ownership: readable plain text and
 * rich HTML per entry, all attached images, and a clean metadata manifest.
 * It never contains encrypted blobs or another user's data — callers must
 * verify ownership of `userId` before invoking.
 */
export class ExportService {
  /**
   * Generates the ZIP archive bytes for a user's entire journal.
   */
  static async generateExportZip(userId: string): Promise<ArrayBuffer> {
    const [entries, notebooks, letters] = await Promise.all([
      JournalService.getAllEntriesForExport(userId),
      NotebooksService.listNotebooks(userId),
      LetterRepository.listMeta(userId),
    ]);
    const notebookNames = new Map(
      notebooks.map((notebook) => [notebook.id, notebook.name]),
    );

    const zip = new JSZip();

    zip.file("README.txt", buildReadme(entries.length, letters.length));

    // Clean metadata manifest — no encrypted fields, no rendered HTML.
    const metadata = entries.map((entry) => ({
      date: entry.date,
      title: entry.title,
      mood: entry.mood,
      wordCount: entry.wordCount,
      notebook:
        (entry.notebookId ? notebookNames.get(entry.notebookId) : null) ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
    zip.file(
      "metadata.json",
      JSON.stringify({
        entries: metadata,
        // Bodies stay exactly as stored: plaintext for legacy accounts,
        // ciphertext for zero-knowledge ones (server never decrypts).
        letters: letters.map((letter) => ({
          unlockDate: letter.unlockDate,
          title: letter.title,
          wordCount: letter.wordCount,
          sealed: letter.sealed,
          readAt: letter.readAt,
          createdAt: letter.createdAt,
          updatedAt: letter.updatedAt,
        })),
      }, null, 2),
    );

    const entriesFolder = zip.folder("entries");
    const imagesFolder = zip.folder("images");
    const savedImageKeys = new Set<string>();

    for (const entry of entries) {
      const { year, monthName } = splitDate(entry.date);
      const monthFolder = entriesFolder?.folder(year)?.folder(monthName);

      const title = entry.title || "Untitled";
      monthFolder?.file(
        `${entry.date}.txt`,
        `TITLE: ${title}\n\n${entry.contentText}`,
      );
      monthFolder?.file(
        `${entry.date}.html`,
        buildEntryHtml(title, entry.date, entry.contentHtml),
      );

      // Collect and store any images this entry references.
      for (const src of extractImageSources(entry)) {
        const key = keyFromPublicUrl(src);
        if (!key || !isOwnedObjectKey(key, userId)) continue;
        if (savedImageKeys.has(key)) continue;

        const bytes = await fetchImageBytes(key);
        if (!bytes) continue;

        savedImageKeys.add(key);
        imagesFolder?.file(fileNameFromKey(key), bytes);
      }
    }

    // Letters to the future self: one .txt/.html pair per letter, filed by
    // unlock date (the day they were meant to be read). Bodies stay exactly
    // as stored — plaintext for legacy accounts, ciphertext for ZK ones.
    if (letters.length > 0) {
      const lettersFolder = zip.folder("letters");
      for (const letter of letters) {
        const { year, monthName } = splitDate(letter.unlockDate);
        const monthFolder = lettersFolder?.folder(year)?.folder(monthName);
        const full = await LetterRepository.getFullById(userId, letter.id);
        if (!full) continue;
        const title = full.title || "Untitled letter";
        monthFolder?.file(
          `${letter.unlockDate}.txt`,
          `TITLE: ${title}\nUNLOCK DATE: ${letter.unlockDate}\n\n${full.contentText}`,
        );
        monthFolder?.file(
          `${letter.unlockDate}.html`,
          buildEntryHtml(title, letter.unlockDate, full.contentHtml),
        );
      }
    }

    // ArrayBuffer (not uint8array) so the route can hand it straight to the
    // Response body — no Buffer.from copy of the whole archive at peak memory.
    return zip.generateAsync({ type: "arraybuffer" });
  }
}

function buildReadme(entryCount: number, letterCount = 0): string {
  return [
    "Withink — Your Journal Export",
    "================================",
    "",
    `This archive contains a complete backup of your ${entryCount} journal ${
      entryCount === 1 ? "entry" : "entries"
    }.`,
    "",
    "Contents:",
    "  metadata.json          Structured details for every entry (date, title, mood, word count, notebook, timestamps).",
    "  entries/<year>/<month>/ One .txt (plain text) and one .html (formatted) file per entry.",
    "  images/                 Every image attached to your entries.",
    letterCount > 0
      ? `  letters/<year>/<month>/  Letters to your future self, filed by unlock date (${letterCount} total).`
      : "",
    "",
    "Your writing belongs to you. Keep this archive somewhere safe.",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEntryHtml(
  title: string,
  date: string,
  contentHtml: string,
): string {
  const safeTitle = escapeHtml(title);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${safeTitle} — ${date}</title>`,
    "</head>",
    "<body>",
    `<h1>${safeTitle}</h1>`,
    `<p><em>${date}</em></p>`,
    "<hr />",
    contentHtml,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Splits a YYYY-MM-DD string into its year and full month name. */
function splitDate(date: string): { year: string; monthName: string } {
  const [year, month] = date.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = new Date(Number(year), monthIndex, 1).toLocaleDateString(
    "en-US",
    {
      month: "long",
    },
  );
  return { year: year || "unknown", monthName };
}

/**
 * Extracts every image src referenced by an entry, scanning both the rendered
 * HTML and the Tiptap JSON document tree.
 */
function extractImageSources(entry: DecryptedEntry): string[] {
  const sources = new Set<string>();

  const urlRegex = /https?:\/\/[^\s"'<>)\\]+/gi;
  for (const url of entry.contentHtml.match(urlRegex) ?? []) {
    sources.add(url);
  }

  const walk = (node: Record<string, unknown>) => {
    const src = (node?.attrs as Record<string, unknown> | undefined)?.src;
    if (node?.type === "image" && typeof src === "string") {
      sources.add(src);
    }
    const content = node?.content;
    if (Array.isArray(content)) {
      for (const child of content) walk(child as Record<string, unknown>);
    }
  };

  if (entry.contentJson && typeof entry.contentJson === "object") {
    try {
      walk(entry.contentJson as Record<string, unknown>);
    } catch {
      // Malformed document tree — the HTML scan above still covers most images.
    }
  }

  return Array.from(sources);
}

/**
 * Returns the R2 object key for a src that points at our own public bucket,
 * or null for anything else. This keeps exports limited to first-party assets
 * and avoids fetching arbitrary external URLs.
 */
function keyFromPublicUrl(src: string): string | null {
  const base = `${env.R2_PUBLIC_URL}/`;
  if (!src.startsWith(base)) return null;
  const key = src.slice(base.length).split(/[?#]/)[0];
  return key ? decodeURIComponent(key) : null;
}

/**
 * Strict prefix-ownership match: an entry may only pull objects from the
 * requesting user's own journal/avatars/system namespaces. Entry HTML is
 * user-authored, so without this a crafted image src could export another
 * tenant's object into this user's ZIP.
 */
function isOwnedObjectKey(key: string, userId: string): boolean {
  const envPrefix = env.IS_PROD ? "" : "dev-";
  return (
    key.startsWith(`${envPrefix}journal/${userId}/`) ||
    key.startsWith(`${envPrefix}avatars/${userId}/`) ||
    key.startsWith(`${envPrefix}system/${userId}/`)
  );
}

function fileNameFromKey(key: string): string {
  return key.split("/").pop() || key;
}

/** Fetches an object's bytes from R2, returning null if it cannot be read. */
async function fetchImageBytes(key: string): Promise<Uint8Array | null> {
  try {
    const response = await r2.send(
      new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
    const body = response.Body;
    if (!body) return null;

    // AWS SDK returns a web ReadableStream / Node Readable / Blob depending on runtime.
    const withBytes = body as {
      transformToByteArray?: () => Promise<Uint8Array>;
    };
    if (typeof withBytes.transformToByteArray === "function") {
      return await withBytes.transformToByteArray();
    }
    return await streamToUint8Array(body as Readable);
  } catch {
    // A single unreadable image must never fail the whole export.
    return null;
  }
}

async function streamToUint8Array(stream: Readable): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
