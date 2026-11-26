import type {
  LocalStore,
  SaveEntryPayload,
  SaveEntryResult,
  SyncEntryPayload,
  SyncListItem,
} from "@withink/core";
import { SYNC_BULK_LIMIT } from "@withink/core";
import type { Cipher } from "@withink/core/crypto";
import { planSyncPull } from "@withink/core/sync-engine";
import {
  buildSearchText,
  createSnippet,
  type CachedEntryMetadata,
} from "@withink/core/timeline";

import type { MasterKey } from "./crypto";

/**
 * Native port of the web's local-first journal cache.
 *
 * The record formats are deliberately identical to the web adapter:
 *
 * - `metadata`  → encrypted JSON `CachedEntryMetadata`
 * - `document`  → encrypted JSON full document
 * - `sync_queue`→ encrypted JSON pending server write
 * - `sync_index`→ plaintext `{date, updatedAt, v}`
 *
 * What to fetch and prune is not decided here — `planSyncPull` in
 * `@withink/core` owns that, so both clients agree on the journal.
 *
 * Dependencies are injected so this module stays free of Expo/React Native
 * imports and runs under Vitest.
 */

/** v3: notebookId (matches the web's metadata version). */
export const METADATA_VERSION = 3;

export interface DiaryApi {
  getSyncList(): Promise<SyncListItem[]>;
  getEntries(dates: string[]): Promise<SyncEntryPayload[]>;
  saveEntry(payload: SaveEntryPayload): Promise<SaveEntryResult>;
  deleteEntry(date: string): Promise<boolean>;
}

export interface LocalDocument {
  date: string;
  title: string;
  mood: number | null;
  contentHtml: string;
  contentText: string;
  contentJson: unknown;
  notebookId?: string;
}

interface QueuedEntry extends LocalDocument {
  wordCount: number;
}

export interface SaveEntryLocallyInput {
  date: string;
  title: string;
  contentText: string;
  contentHtml: string;
  contentJson: unknown;
  mood: number | null;
  notebookId?: string;
  createdAt?: string;
  /** Defaults to now; the server timestamp after a push. */
  updatedAt?: string;
}

export interface FlushResult {
  pushed: number;
  failed: number;
  lastError: string | null;
}

export interface PullResult {
  fetched: number;
  pruned: number;
}

export interface SyncResult {
  pushed: number;
  failed: number;
  fetched: number;
  pruned: number;
  lastError: string | null;
}

export interface DiaryCacheDeps {
  store: LocalStore;
  api: DiaryApi;
  crypto: Pick<Cipher<MasterKey>, "encryptText" | "decryptText">;
  now: () => number;
  localToday: () => string;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Sync failed.";
}

async function decryptOrEmpty(
  crypto: DiaryCacheDeps["crypto"],
  value: string,
  key: MasterKey,
): Promise<string> {
  try {
    return await crypto.decryptText(value, key);
  } catch {
    return "";
  }
}

export function createDiaryCache(deps: DiaryCacheDeps) {
  const { store, api, crypto, now, localToday } = deps;
  let syncInFlight: Promise<SyncResult> | null = null;

  async function encrypt(value: unknown, key: MasterKey): Promise<string> {
    return await crypto.encryptText(JSON.stringify(value), key);
  }

  async function saveLocalMetadata(
    input: SaveEntryLocallyInput & { updatedAt: string },
    key: MasterKey,
  ): Promise<CachedEntryMetadata> {
    const payload: CachedEntryMetadata = {
      date: input.date,
      title: input.title || "",
      snippet: createSnippet(input.contentText),
      contentText: input.contentText,
      wordCount: input.contentText.trim()
        ? input.contentText.trim().split(/\s+/).length
        : 0,
      mood: input.mood,
      notebookId: input.notebookId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      v: METADATA_VERSION,
      searchText: buildSearchText(
        input.date,
        input.title || "",
        input.contentText,
      ),
    };

    await store.putMetadata(
      input.date,
      await encrypt(payload, key),
    );
    await store.putSyncIndex({
      date: input.date,
      updatedAt: input.updatedAt,
      v: METADATA_VERSION,
    });
    return payload;
  }

  /**
   * Writes the encrypted document, metadata row and pending queue item.
   * The queue item is written last: its presence is the "this edit is not on
   * the server yet" marker, so it must not precede the local data.
   */
  async function saveEntryLocally(
    input: SaveEntryLocallyInput,
    key: MasterKey,
  ): Promise<CachedEntryMetadata> {
    const updatedAt = input.updatedAt ?? new Date(now()).toISOString();

    const document: LocalDocument = {
      date: input.date,
      title: input.title || "",
      mood: input.mood,
      contentHtml: input.contentHtml,
      contentText: input.contentText,
      contentJson: input.contentJson,
      notebookId: input.notebookId,
    };
    await store.putDocument(input.date, await encrypt(document, key));

    const metadata = await saveLocalMetadata({ ...input, updatedAt }, key);

    const queued: QueuedEntry = {
      ...document,
      wordCount: metadata.wordCount,
    };
    await store.putSyncItem(input.date, await encrypt(queued, key));
    return metadata;
  }

  async function getLocalTimeline(key: MasterKey): Promise<CachedEntryMetadata[]> {
    const rows = await store.getAllMetadata();
    const entries: CachedEntryMetadata[] = [];
    for (const row of rows) {
      try {
        entries.push(
          JSON.parse(await crypto.decryptText(row.value, key)) as CachedEntryMetadata,
        );
      } catch (err) {
        console.error(`Failed to decrypt cached entry for ${row.key}:`, err);
      }
    }
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }

  async function getLocalMetadata(
    date: string,
    key: MasterKey,
  ): Promise<CachedEntryMetadata | null> {
    const encrypted = await store.getMetadata(date);
    if (!encrypted) return null;
    try {
      return JSON.parse(
        await crypto.decryptText(encrypted, key),
      ) as CachedEntryMetadata;
    } catch {
      return null;
    }
  }

  async function getLocalEntry(
    date: string,
    key: MasterKey,
  ): Promise<LocalDocument | null> {
    const encrypted = await store.getDocument(date);
    if (!encrypted) return null;
    try {
      return JSON.parse(await crypto.decryptText(encrypted, key)) as LocalDocument;
    } catch {
      return null;
    }
  }

  async function deleteLocalEntry(date: string): Promise<void> {
    await Promise.all([
      store.deleteMetadata(date),
      store.deleteDocument(date),
      store.deleteSyncItem(date),
      store.deleteSyncIndex(date),
    ]);
  }

  /**
   * Pushes queued local edits, newest wins. The queue item is consumed with a
   * compare-and-delete so an edit made while the request was in flight stays
   * queued for the next run.
   */
  async function flushQueue(key: MasterKey): Promise<FlushResult> {
    const items = await store.getAllSyncItems();
    let pushed = 0;
    let failed = 0;
    let lastError: string | null = null;

    for (const item of items) {
      try {
        const queued = JSON.parse(
          await crypto.decryptText(item.value, key),
        ) as QueuedEntry;

        // Re-encrypt each field with the server-facing format (fresh IVs).
        const [title, contentHtml, contentText, contentJson] = await Promise.all([
          crypto.encryptText(queued.title, key),
          crypto.encryptText(queued.contentHtml, key),
          crypto.encryptText(queued.contentText, key),
          crypto.encryptText(JSON.stringify(queued.contentJson), key),
        ]);

        const result = await api.saveEntry({
          date: queued.date,
          title,
          contentHtml,
          contentText,
          contentJson,
          wordCount: queued.wordCount,
          mood: queued.mood,
          notebookId: queued.notebookId,
          today: localToday(),
        });

        const current = await store.getSyncItem(item.key);
        if (!current || current === item.value) {
          await store.deleteSyncItem(queued.date);
          const existing = await getLocalMetadata(queued.date, key);
          await saveLocalMetadata(
            {
              date: queued.date,
              title: queued.title,
              contentText: queued.contentText,
              contentHtml: queued.contentHtml,
              contentJson: queued.contentJson,
              mood: queued.mood,
              notebookId: result.notebookId ?? undefined,
              createdAt: existing?.createdAt,
              updatedAt: result.updatedAt,
            },
            key,
          );
          pushed++;
        }
      } catch (err) {
        failed++;
        lastError = describeError(err);
        console.error(`Failed to flush queued entry ${item.key}:`, err);
      }
    }

    return { pushed, failed, lastError };
  }

  async function ingestEntry(
    entry: SyncEntryPayload,
    key: MasterKey,
  ): Promise<void> {
    const title = await decryptOrEmpty(crypto, entry.title, key);
    const contentText = await decryptOrEmpty(crypto, entry.contentText, key);

    let contentHtml = "";
    let contentJson: unknown = {};
    try {
      contentHtml = await crypto.decryptText(entry.contentHtml, key);
      contentJson = JSON.parse(await crypto.decryptText(entry.contentJson, key));
    } catch (err) {
      console.error(`Failed to decrypt document fields for ${entry.date}:`, err);
    }

    // The user may have started editing while the fetch was in flight.
    if (await store.getSyncItem(entry.date)) return;

    const document: LocalDocument = {
      date: entry.date,
      title,
      mood: entry.mood,
      contentHtml,
      contentText,
      contentJson,
      notebookId: entry.notebookId ?? undefined,
    };
    await store.putDocument(entry.date, await encrypt(document, key));
    await saveLocalMetadata(
      {
        date: entry.date,
        title,
        contentText,
        contentHtml,
        contentJson,
        mood: entry.mood,
        notebookId: entry.notebookId ?? undefined,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
      key,
    );
  }

  async function pullFromServer(key: MasterKey): Promise<PullResult> {
    const [manifest, queued] = await Promise.all([
      api.getSyncList(),
      store.getAllSyncItems(),
    ]);
    const pending = new Set(queued.map((item) => item.key));

    let localIndex = await store.getSyncIndex();
    if (localIndex.length === 0) {
      // Devices that cached entries before the index existed: derive it once
      // from the encrypted metadata instead of re-fetching the journal.
      const timeline = await getLocalTimeline(key);
      for (const entry of timeline) {
        await store.putSyncIndex({
          date: entry.date,
          updatedAt: entry.updatedAt,
          v: entry.v,
        });
      }
      localIndex = await store.getSyncIndex();
    }

    const plan = planSyncPull({
      serverEntries: manifest,
      localIndex,
      pendingDates: pending,
      metadataVersion: METADATA_VERSION,
      nowMs: now(),
    });

    let pruned = 0;
    for (const date of plan.pruneDates) {
      // Re-check immediately before deleting: an edit started during this
      // pull must not lose its queue item or local copy.
      if (await store.getSyncItem(date)) continue;
      await deleteLocalEntry(date);
      pruned++;
    }

    let fetched = 0;
    for (let i = 0; i < plan.fetchDates.length; i += SYNC_BULK_LIMIT) {
      const chunk = plan.fetchDates.slice(i, i + SYNC_BULK_LIMIT);
      let entries: SyncEntryPayload[] = [];
      try {
        entries = await api.getEntries(chunk);
      } catch (err) {
        console.error("Failed to fetch entry batch:", err);
        continue;
      }
      const byDate = new Map(entries.map((entry) => [entry.date, entry]));
      for (const date of chunk) {
        const entry = byDate.get(date);
        if (!entry) continue;
        try {
          await ingestEntry(entry, key);
          fetched++;
        } catch (err) {
          console.error(`Failed to ingest entry ${date}:`, err);
        }
      }
    }

    return { fetched, pruned };
  }

  /** Fetches one entry when the editor opens a date the device has not seen. */
  async function fetchEntryIfMissing(
    date: string,
    key: MasterKey,
  ): Promise<LocalDocument | null> {
    const local = await getLocalEntry(date, key);
    if (local) return local;

    try {
      const entries = await api.getEntries([date]);
      const entry = entries.find((item) => item.date === date);
      if (entry) await ingestEntry(entry, key);
    } catch (err) {
      console.error(`Failed to fetch entry ${date}:`, err);
    }
    return await getLocalEntry(date, key);
  }

  /**
   * Full reconciliation: push first (local is authoritative for pending
   * dates), then pull server changes that newer-than-local. Single-flight so
   * an unlock and a pull-to-refresh cannot interleave.
   */
  function sync(key: MasterKey): Promise<SyncResult> {
    if (syncInFlight) return syncInFlight;
    const run = (async (): Promise<SyncResult> => {
      const flush = await flushQueue(key);
      let pull: PullResult = { fetched: 0, pruned: 0 };
      try {
        pull = await pullFromServer(key);
      } catch (err) {
        return {
          pushed: flush.pushed,
          failed: flush.failed,
          fetched: 0,
          pruned: 0,
          lastError: flush.lastError ?? describeError(err),
        };
      }
      return {
        pushed: flush.pushed,
        failed: flush.failed,
        ...pull,
        lastError: flush.lastError,
      };
    })();
    syncInFlight = run;
    return run.finally(() => {
      if (syncInFlight === run) syncInFlight = null;
    });
  }

  async function pendingCount(): Promise<number> {
    return (await store.getAllSyncItems()).length;
  }

  /** Deletes the entry on the server, then purges every local copy. */
  async function deleteEntry(date: string): Promise<void> {
    await api.deleteEntry(date);
    await deleteLocalEntry(date);
  }

  return {
    saveEntryLocally,
    getLocalTimeline,
    getLocalMetadata,
    getLocalEntry,
    fetchEntryIfMissing,
    flushQueue,
    pullFromServer,
    ingestEntry,
    sync,
    pendingCount,
    deleteEntry,
    deleteLocalEntry,
  };
}

export type DiaryCache = ReturnType<typeof createDiaryCache>;
