import { isClientCiphertext } from "./ciphertext";

/**
 * Pure parsing helpers for a Withink export ZIP:
 * `metadata.json` plus `entries/{year}/{month}/{date}.{txt,html}`.
 *
 * The ZIP itself is unpacked by the client (browser: JSZip, native: fflate),
 * so this module stays dependency-free and runs anywhere.
 */

/** Entries cap shared by every importer. */
export const MAX_IMPORT_ENTRIES = 5000;

/** Matches one exported page; group 1 is the date, group 2 the format. */
export const ARCHIVE_ENTRY_PATH =
  /^entries\/\d{4}\/[^/]+\/(\d{4}-\d{2}-\d{2})\.(html|txt)$/;

export interface ArchiveEntryPaths {
  date: string;
  htmlPath?: string;
  txtPath?: string;
}

export interface ArchiveEntryMeta {
  title?: string;
  mood?: number | null;
  wordCount?: number;
  updatedAt?: string;
}

export interface ArchiveEntryText {
  headerTitle: string;
  text: string;
}

/**
 * Groups archive paths by date, keeping whichever slots exist. Sorted
 * oldest-first so imports land in a stable order.
 */
export function indexArchiveEntries(
  paths: readonly string[],
): ArchiveEntryPaths[] {
  const byDate = new Map<string, ArchiveEntryPaths>();
  for (const path of paths) {
    const match = ARCHIVE_ENTRY_PATH.exec(path);
    if (!match) continue;
    const date = match[1]!;
    const slot = byDate.get(date) ?? { date };
    if (match[2] === "html") slot.htmlPath = path;
    else slot.txtPath = path;
    byDate.set(date, slot);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * `metadata.json` is an array (client export) or an object keyed by date.
 * Returns an empty map on malformed JSON so the caller can fall back to the
 * per-entry text headers.
 */
export function parseArchiveMetadata(
  json: string,
): Record<string, ArchiveEntryMeta> {
  const metadata: Record<string, ArchiveEntryMeta> = {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return metadata;
  }

  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (
        row &&
        typeof row === "object" &&
        typeof (row as { date?: unknown }).date === "string"
      ) {
        const record = row as { date: string } & ArchiveEntryMeta;
        metadata[record.date] = record;
      }
    }
    return metadata;
  }

  if (parsed && typeof parsed === "object") {
    for (const [date, row] of Object.entries(parsed)) {
      if (row && typeof row === "object") {
        metadata[date] = row as ArchiveEntryMeta;
      }
    }
  }

  return metadata;
}

/**
 * A `.txt` page starts with optional `TITLE:` metadata, a blank line, then the
 * body. Files without that header are treated as body-only.
 */
export function parseArchiveEntryText(raw: string): ArchiveEntryText {
  const bodyStart = raw.indexOf("\n\n");
  const text = bodyStart >= 0 ? raw.slice(bodyStart + 2) : raw;
  const headerTitle = raw.match(/^TITLE:\s*(.*)$/m)?.[1]?.trim() ?? "";
  return { headerTitle, text };
}

/**
 * A raw server archive stores ciphertext; importing it would double-encrypt.
 * Only the decrypted ZIP from Settings → Export is importable.
 */
export function isArchiveCiphertext(input: {
  title: string;
  text: string;
  html: string;
}): boolean {
  return (
    isClientCiphertext(input.title) ||
    isClientCiphertext(input.text) ||
    isClientCiphertext(input.html)
  );
}
