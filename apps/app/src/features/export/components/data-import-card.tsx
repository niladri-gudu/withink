"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import { countWords } from "@withink/core/text";
import { toast } from "sonner";

import { diaryCacheDB } from "@/lib/diary-cache-db";
import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import { saveEntryAction } from "@/features/journal/actions/entry-actions";
import { diaryCacheService } from "@/features/journal/services/diary-cache-service";
import { journalSyncService } from "@/features/journal/services/journal-sync-service";

const MAX_ENTRIES = 5000;
const ENTRY_PATH = /^entries\/\d{4}\/[^/]+\/(\d{4}-\d{2}-\d{2})\.(html|txt)$/;

interface ZipFileLike {
  async(type: "string"): Promise<string>;
}

interface ImportMeta {
  title?: string;
  mood?: number | null;
  wordCount?: number;
  updatedAt?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

/**
 * Imports a Withink export ZIP: `metadata.json` plus
 * `entries/{year}/{month}/{date}.{txt,html}`. Dates already on this device are
 * skipped. ZK accounts encrypt locally and queue a background push; non-ZK
 * accounts save through the usual action.
 */
export function DataImportCard() {
  const { isClientEncrypted, masterKey } = useEncryption();
  const queryClient = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const handleFile = async (file: File) => {
    if (isClientEncrypted && !masterKey) {
      toast.error("Unlock your diary to import.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(file);

      const filesByDate = new Map<
        string,
        { html?: ZipFileLike; txt?: ZipFileLike }
      >();
      for (const path of Object.keys(zip.files)) {
        const match = path.match(ENTRY_PATH);
        if (!match) continue;
        const date = match[1]!;
        const slot = filesByDate.get(date) ?? {};
        const entry = zip.file(path);
        if (!entry) continue;
        if (match[2] === "html") slot.html = entry;
        else slot.txt = entry;
        filesByDate.set(date, slot);
      }

      if (filesByDate.size === 0) {
        toast.error("No entries found in this archive.");
        return;
      }
      if (filesByDate.size > MAX_ENTRIES) {
        toast.error(`This archive has more than ${MAX_ENTRIES} entries.`);
        return;
      }

      // metadata.json is an array (client export) or an object keyed by date.
      const metadata: Record<string, ImportMeta> = {};
      const metaFile = zip.file("metadata.json");
      if (metaFile) {
        try {
          const parsed: unknown = JSON.parse(await metaFile.async("string"));
          if (Array.isArray(parsed)) {
            for (const row of parsed) {
              if (
                row &&
                typeof row === "object" &&
                typeof (row as { date?: unknown }).date === "string"
              ) {
                const record = row as { date: string } & ImportMeta;
                metadata[record.date] = record;
              }
            }
          } else if (parsed && typeof parsed === "object") {
            for (const [date, row] of Object.entries(parsed)) {
              if (row && typeof row === "object") {
                metadata[date] = row as ImportMeta;
              }
            }
          }
        } catch {
          // Fall back to the per-entry TITLE/text headers.
        }
      }

      // Never overwrite a date that already exists on this device.
      const existing = new Set<string>();
      if (isClientEncrypted) {
        const index = await diaryCacheDB.getAllSyncIndex();
        for (const row of index) existing.add(row.date);
      }

      const today = getLocalDateString();
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const date of [...filesByDate.keys()].sort()) {
        if (existing.has(date)) {
          skipped++;
          continue;
        }
        const slot = filesByDate.get(date)!;
        try {
          const html = slot.html ? await slot.html.async("string") : "";
          const rawText = slot.txt ? await slot.txt.async("string") : "";
          const bodyStart = rawText.indexOf("\n\n");
          const text = bodyStart >= 0 ? rawText.slice(bodyStart + 2) : rawText;
          const headerTitle =
            rawText.match(/^TITLE:\s*(.*)$/m)?.[1]?.trim() ?? "";
          const meta = metadata[date] ?? {};
          const title = (meta.title ?? headerTitle).trim();
          const mood = meta.mood ?? null;
          const wordCount = meta.wordCount ?? countWords(text);
          const updatedAt = meta.updatedAt ?? new Date().toISOString();

          if (isClientEncrypted && masterKey) {
            await diaryCacheService.saveLocalDocument(
              date,
              title,
              mood,
              html,
              text,
              {},
              masterKey,
            );
            await diaryCacheService.saveLocalMetadata(
              date,
              title,
              text,
              wordCount,
              mood,
              updatedAt,
              masterKey,
            );
            await diaryCacheService.enqueueOfflineSync(
              date,
              {
                date,
                title,
                mood,
                contentHtml: html,
                contentText: text,
                contentJson: {},
                wordCount,
              },
              masterKey,
            );
            imported++;
          } else {
            const res = await saveEntryAction(
              {
                date,
                title,
                mood,
                contentHtml: html,
                contentText: text,
                contentJson: {},
                wordCount,
              },
              today,
            );
            if (res.success) imported++;
            else failed++;
          }
        } catch (error) {
          console.error(`Import failed for ${date}:`, error);
          failed++;
        }
      }

      setResult({ imported, skipped, failed });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["local-journal"] }),
      ]);
      if (isClientEncrypted && masterKey && imported > 0) {
        void journalSyncService.requestPush(masterKey);
      }

      if (imported > 0) {
        toast.success(
          `Imported ${imported} ${imported === 1 ? "entry" : "entries"}.`,
        );
      } else {
        toast.message("Nothing new to import.");
      }
    } catch (error) {
      console.error("Journal import failed:", error);
      toast.error("Couldn't read that archive. Use a Withink export ZIP.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-foreground font-serif text-base font-semibold">
          Import a journal
        </h3>
        <p className="text-muted-foreground text-sm">
          Restore a Withink export (.zip). Dates already on this device are
          skipped; entries are encrypted locally and synced in the background.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy || (isClientEncrypted && !masterKey)}
        >
          {busy ? "Importing…" : "Choose archive…"}
        </Button>
        {isClientEncrypted && !masterKey && (
          <span className="text-muted-foreground text-xs">
            Unlock your diary to import.
          </span>
        )}
      </div>
      {result && (
        <p className="text-muted-foreground text-xs" role="status">
          Imported {result.imported} · Skipped {result.skipped} · Failed{" "}
          {result.failed}
        </p>
      )}
    </div>
  );
}
