"use client";

import * as React from "react";
import { Archive, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";
import { getAllEntriesAction } from "@/features/journal/actions/entry-actions";

/**
 * "Your data" section for the Settings page. Downloads a complete ZIP backup
 * of the user's journal. If client-side encryption is enabled, fetches the
 * encrypted data and builds the ZIP client-side after decrypting locally.
 */
export function DataExportCard() {
  const [isExporting, setIsExporting] = React.useState(false);
  const { isClientEncrypted, masterKey } = useEncryption();

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Preparing your archive…");

    try {
      if (isClientEncrypted && masterKey) {
        // Zero-knowledge client-side export
        const entriesRes = await getAllEntriesAction();
        if (!entriesRes.success || !entriesRes.data) {
          throw new Error(entriesRes.error || "Failed to fetch entries");
        }

        const entries = entriesRes.data;
        const zip = new JSZip();

        zip.file("README.txt", buildReadme(entries.length));

        // Clean metadata manifest
        const metadata = entries.map((entry) => ({
          date: entry.date,
          title: entry.title,
          mood: entry.mood,
          wordCount: entry.wordCount,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }));
        zip.file("metadata.json", JSON.stringify(metadata, null, 2));

        const entriesFolder = zip.folder("entries");

        for (const entry of entries) {
          const contentHtml = await safeDecryptText(entry.contentHtml, masterKey);
          const contentText = await safeDecryptText(entry.contentText, masterKey);

          const { year, monthName } = splitDate(entry.date);
          const monthFolder = entriesFolder?.folder(year)?.folder(monthName);

          const title = entry.title || "Untitled";
          monthFolder?.file(`${entry.date}.txt`, `TITLE: ${title}\n\n${contentText}`);
          monthFolder?.file(`${entry.date}.html`, buildEntryHtml(title, entry.date, contentHtml));
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `withink-zk-export-${new Date().toLocaleDateString("en-CA")}.zip`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);

        toast.success("Your zero-knowledge archive is ready", { id: toastId });
      } else {
        // Standard server-side export
        const res = await fetch("/api/export");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to prepare your archive");
        }

        const blob = await res.blob();
        const filename =
          parseFilename(res.headers.get("Content-Disposition")) ??
          `withink-export-${new Date().toLocaleDateString("en-CA")}.zip`;

        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);

        toast.success("Your archive is ready", { id: toastId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground">
          <Archive className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-h3">Your data</h2>
          <p className="text-body-small text-muted-foreground">
            Download a complete backup of your journal — plain text, formatted entries, and a metadata file.
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-body-small text-muted-foreground">
          Everything you&apos;ve written, packaged into a single ZIP you own forever.
        </p>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-full gap-2 shrink-0"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download archive
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

/** Extracts the filename from a Content-Disposition header, if present. */
function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}

function buildReadme(entryCount: number): string {
  return [
    "Withink — Your Zero-Knowledge Journal Export",
    "===========================================",
    "",
    `This archive contains a complete backup of your ${entryCount} journal ${
      entryCount === 1 ? "entry" : "entries"
    }.`,
    "",
    "Contents:",
    "  metadata.json          Structured details for every entry (date, title, mood, word count, timestamps).",
    "  entries/<year>/<month>/ One .txt (plain text) and one .html (formatted) file per entry.",
    "",
    "Your writing is fully decrypted client-side and belongs to you. Keep this archive somewhere safe.",
    "",
  ].join("\n");
}

function buildEntryHtml(title: string, date: string, contentHtml: string): string {
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

function splitDate(date: string): { year: string; monthName: string } {
  const [year, month] = date.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = new Date(Number(year), monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
  });
  return { year: year || "unknown", monthName };
}
