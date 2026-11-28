import {
  indexArchiveEntries,
  isArchiveCiphertext,
  MAX_IMPORT_ENTRIES,
  parseArchiveEntryText,
  parseArchiveMetadata,
} from '@withink/core';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { strFromU8, unzipSync } from 'fflate';

import { diaryCache } from './diary-cache';
import type { MasterKey } from './crypto';

export interface ImportSummary {
  imported: number;
  skipped: number;
  failed: number;
}

/** Opens the system picker and returns the ZIP bytes, or null if cancelled. */
export async function pickArchive(): Promise<Uint8Array | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset) return null;
  return await new File(asset.uri).bytes();
}

/**
 * Restores a Withink export ZIP into the local store. Dates already on the
 * device are skipped; every imported page is encrypted and queued exactly like
 * an editor save, so the next sync pushes it.
 */
export async function importArchive(
  bytes: Uint8Array,
  masterKey: MasterKey,
  existingDates: ReadonlySet<string>,
): Promise<ImportSummary> {
  const files = unzipSync(bytes);
  const entries = indexArchiveEntries(Object.keys(files));

  if (entries.length === 0) {
    throw new Error('No entries found in this archive.');
  }
  if (entries.length > MAX_IMPORT_ENTRIES) {
    throw new Error(`This archive has more than ${MAX_IMPORT_ENTRIES} entries.`);
  }

  const metaFile = files['metadata.json'];
  const metadata = metaFile
    ? parseArchiveMetadata(strFromU8(metaFile))
    : {};

  const summary: ImportSummary = { imported: 0, skipped: 0, failed: 0 };

  for (const entry of entries) {
    if (existingDates.has(entry.date)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const html = entry.htmlPath
        ? strFromU8(files[entry.htmlPath]!)
        : '';
      const rawText = entry.txtPath ? strFromU8(files[entry.txtPath]!) : '';
      const { headerTitle, text } = parseArchiveEntryText(rawText);
      const meta = metadata[entry.date] ?? {};
      const title = (meta.title ?? headerTitle).trim();

      if (isArchiveCiphertext({ title, text, html })) {
        summary.failed += 1;
        continue;
      }

      await diaryCache.saveEntryLocally(
        {
          date: entry.date,
          title,
          mood: meta.mood ?? null,
          contentHtml: html,
          contentText: text,
          contentJson: {},
          updatedAt: meta.updatedAt ?? new Date().toISOString(),
        },
        masterKey,
      );
      summary.imported += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}
