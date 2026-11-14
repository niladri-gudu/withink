import { decryptText, encryptText } from "@/lib/crypto-client";
import { diaryCacheDB } from "@/lib/diary-cache-db";
import { addDays } from "@/lib/utils/date";

import {
  getEntriesBulkAction,
  getEntrySyncListAction,
  saveEntryAction,
} from "../actions/entry-actions";

export interface CachedMetadata {
  date: string;
  title: string;
  /** Short preview shown in timeline cards. */
  snippet: string;
  /** Full plaintext of the entry, used for local search. */
  contentText: string;
  wordCount: number;
  mood: number | null;
  /** Notebook filing (v3+). Absent on records written before notebooks. */
  notebookId?: string;
  updatedAt: string;
  /** Schema version so `syncDiaryCache` can re-fetch records written by older code. */
  v: number;
  /** Precomputed lowercase search blob (title + full text + date forms) so
   *  filtering never re-lowercases/re-locale-formats every record per keystroke.
   *  Absent on records written before this field was added; `filterLocalTimeline`
   *  falls back to computing it on the fly for those. */
  searchText?: string;
}

// v3: added notebookId (Notebooks fast-follow). Bumping the version makes
// existing devices re-fetch every metadata record exactly once during the
// next pull, which backfills the field without a store migration.
const METADATA_VERSION = 3;

/**
 * Builds the lowercase search blob used by `filterLocalTimeline`. Computed once
 * at save time (not per keystroke) so searching a large journal stays cheap.
 */
function buildSearchText(
  date: string,
  title: string,
  contentText: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  let dateForms = "";
  if (year !== undefined && month !== undefined && day !== undefined) {
    const dateObj = new Date(year, month - 1, day);
    dateForms = [
      dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    ]
      .join(" ")
      .toLowerCase();
  }
  return [title, contentText, date, dateForms].join(" ").toLowerCase();
}

/**
 * Extracts a clean text snippet from content text
 */
function createSnippet(text: string, maxLength = 240): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + "…"
    : cleaned;
}

// In-memory cache of the decrypted timeline, keyed by the unlocked CryptoKey
// reference. Decrypting every record on every search is O(N) crypto work that
// gets slow as a journal grows; caching the decrypted list makes searches
// instant after the first one. Writes update it in place (upsert below) rather
// than invalidating it, so an autosave doesn't force a full re-decrypt.
// Keyed by the key object so a new unlock (new key) automatically rebuilds it,
// and it is cleared on lock to release plaintext from memory.
let timelineCache: { key: CryptoKey; entries: CachedMetadata[] } | null = null;

function invalidateTimelineCache(): void {
  timelineCache = null;
}

/**
 * Replaces or inserts one record in the in-memory decrypted timeline without
 * dropping the rest of it. This is what keeps an autosave or a single pulled
 * entry from forcing a full IndexedDB read + decrypt on the next render.
 * No-op when the cache has not been built yet (the next load reads IDB) or
 * belongs to a previous unlock.
 */
function upsertTimelineCache(
  masterKey: CryptoKey,
  record: CachedMetadata,
): void {
  if (!timelineCache || timelineCache.key !== masterKey) return;

  const entries = timelineCache.entries;
  const index = entries.findIndex((entry) => entry.date === record.date);
  if (index >= 0) {
    entries[index] = record;
    return;
  }

  // Keep the descending-date invariant without re-sorting the whole array.
  let insertAt = entries.findIndex((entry) => entry.date < record.date);
  if (insertAt === -1) insertAt = entries.length;
  entries.splice(insertAt, 0, record);
}

function removeFromTimelineCache(date: string): void {
  if (!timelineCache) return;
  const index = timelineCache.entries.findIndex((entry) => entry.date === date);
  if (index >= 0) timelineCache.entries.splice(index, 1);
}

/** Structural shape of a server entry used by the pull (kept local so this
 *  client module never imports the server-only journal service). */
interface ServerEntryPayload {
  date: string;
  title: string;
  contentHtml: string;
  contentText: string;
  /** Ciphertext string (zero-knowledge pull only; legacy rows never reach here). */
  contentJson: string;
  mood: number | null;
  wordCount: number;
  notebookId: string | null;
  updatedAt: string | Date;
}

// Fingerprint of the server sync list from the last full pull, keyed by the
// master key. When the fingerprint is unchanged (and there are no pending local
// edits) the pull has nothing to do, so we skip even the plaintext sync-index
// read + diff that `syncDiaryCache` would otherwise run every background tick.
let lastServerSyncFingerprint: { key: CryptoKey; fingerprint: string } | null =
  null;

function syncListFingerprint(
  entries: { date: string; updatedAt: string }[],
): string {
  return entries.map((e) => `${e.date}:${e.updatedAt}`).join("|");
}

// Single-flight guard for full pulls. Concurrent triggers (unlock, network
// recovery, visibility change, the provider interval, the entries-page idle
// sync) would otherwise interleave IndexedDB reads/writes and widen every
// prune/pull race window. Late callers piggyback on the in-flight run.
let pullInFlight: Promise<boolean> | null = null;

export interface LocalTimelineFilters {
  moodFilter?: number | "all";
  timeFilter?: "all" | "week" | "month";
  search?: string;
  /** Notebook scope ("all" or a notebook id); unset means all. */
  notebookFilter?: string;
  localToday: string;
}

/**
 * Pure filter over a decrypted local timeline. Extracted from the timeline
 * component so the search/filter behavior is unit-testable.
 *
 * Search matches the FULL entry text (falling back to the snippet for records
 * not yet re-synced to the full-text format), the title, the ISO date, and
 * human-readable date forms ("Jul 1", "July 4, 2026").
 */
export function filterLocalTimeline(
  cached: CachedMetadata[],
  filters: LocalTimelineFilters,
): CachedMetadata[] {
  const {
    moodFilter = "all",
    timeFilter = "all",
    search = "",
    notebookFilter,
    localToday,
  } = filters;

  let filtered = cached;

  // Records written before METADATA_VERSION 3 carry no notebookId; they are
  // excluded from a scoped view until their one-time re-sync backfills it.
  if (notebookFilter && notebookFilter !== "all") {
    filtered = filtered.filter((item) => item.notebookId === notebookFilter);
  }

  if (moodFilter !== "all") {
    const m = Number(moodFilter);
    filtered = filtered.filter((item) => item.mood === m);
  }

  if (timeFilter !== "all") {
    filtered = filtered.filter((item) => {
      if (timeFilter === "week") {
        return item.date >= addDays(localToday, -7) && item.date <= localToday;
      }
      if (timeFilter === "month") {
        return item.date >= addDays(localToday, -30) && item.date <= localToday;
      }
      return true;
    });
  }

  if (search.trim()) {
    const queryLower = search.trim().toLowerCase();
    filtered = filtered.filter((item) => {
      // Fast path: precomputed lowercase blob written at save time. Records
      // written before that field existed fall back to computing it inline.
      const searchText = (
        item.searchText ||
        buildSearchText(item.date, item.title, item.contentText || item.snippet)
      ).toLowerCase();
      return searchText.includes(queryLower);
    });
  }

  return filtered;
}

export const diaryCacheService = {
  /**
   * Encrypts and saves a metadata record locally in IndexedDB
   */
  async saveLocalMetadata(
    date: string,
    title: string,
    contentText: string,
    wordCount: number,
    mood: number | null,
    updatedAt: string | Date,
    masterKey: CryptoKey,
    notebookId?: string | null,
  ): Promise<void> {
    const updatedAtStr =
      updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt;
    const snippet = createSnippet(contentText);

    const payload: CachedMetadata = {
      date,
      title: title || "",
      snippet,
      contentText,
      wordCount: wordCount || 0,
      mood,
      notebookId: notebookId ?? undefined,
      updatedAt: updatedAtStr,
      v: METADATA_VERSION,
      searchText: buildSearchText(date, title || "", contentText),
    };

    const encrypted = await encryptText(JSON.stringify(payload), masterKey);
    await diaryCacheDB.set(date, encrypted);
    // Plaintext sync index (timestamp + schema version only, both already
    // stored plaintext server-side) so pulls never decrypt to diff.
    await diaryCacheDB.putSyncIndex({
      date,
      updatedAt: updatedAtStr,
      v: METADATA_VERSION,
    });
    // Update the in-memory timeline surgically instead of dropping it. The
    // old behavior re-decrypted every record after each autosave.
    upsertTimelineCache(masterKey, payload);
  },

  /**
   * Reads and decrypts all cached metadata records. Results are cached in
   * memory per unlock so repeated searches filter an array instead of
   * re-decrypting every record each time.
   */
  async getLocalCacheTimeline(masterKey: CryptoKey): Promise<CachedMetadata[]> {
    if (timelineCache && timelineCache.key === masterKey) {
      return timelineCache.entries;
    }

    try {
      const entries = await diaryCacheDB.getAllEntries();
      const decrypted = await Promise.all(
        entries.map(async (entry) => {
          try {
            const decryptedStr = await decryptText(entry.value, masterKey);
            const parsed = JSON.parse(decryptedStr) as CachedMetadata;
            return parsed;
          } catch (e) {
            console.error(
              `Failed to decrypt cached entry for ${entry.key}:`,
              e,
            );
            return null;
          }
        }),
      );

      // Filter out failures and sort descending by date
      const result = (decrypted.filter(Boolean) as CachedMetadata[]).sort(
        (a, b) => b.date.localeCompare(a.date),
      );

      // Backfill the plaintext sync index for devices upgrading from a build
      // that predates it (v2 metadata only). Without this the first pull
      // would treat every entry as missing and re-fetch the whole journal.
      const indexed = await diaryCacheDB.getAllSyncIndex();
      const indexedDates = new Set(indexed.map((row) => row.date));
      const missing = result.filter((entry) => !indexedDates.has(entry.date));
      if (missing.length > 0) {
        await Promise.all(
          missing.map((entry) =>
            diaryCacheDB.putSyncIndex({
              date: entry.date,
              updatedAt: entry.updatedAt,
              v: entry.v,
            }),
          ),
        );
      }

      // A record that failed to decrypt must not keep its index row: the pull
      // would trust the stale timestamp and never re-fetch. Dropping the row
      // makes `runPull` see the date as missing and self-heal it.
      if (entries.length > 0) {
        const decryptedDates = new Set(result.map((entry) => entry.date));
        const staleIndex = indexed.filter(
          (row) => !decryptedDates.has(row.date),
        );
        if (staleIndex.length > 0) {
          await Promise.all(
            staleIndex.map((row) =>
              diaryCacheDB.deleteSyncIndex(row.date),
            ),
          );
        }
      }

      timelineCache = { key: masterKey, entries: result };
      return result;
    } catch (err) {
      console.error("Failed to load local cache timeline:", err);
      return [];
    }
  },

  /**
   * Drops the in-memory decrypted timeline. Called on lock so plaintext entry
   * text is released from memory, and safe to call after any external cache
   * mutation.
   */
  clearTimelineCache(): void {
    invalidateTimelineCache();
    lastServerSyncFingerprint = null;
  },

  /**
   * Deletes every local record for a date after the entry was deleted on the
   * server. All three stores are purged: leaving the document blob behind
   * would let a deleted entry resurrect in the editor (and get re-pushed to
   * the cloud), and leaving its sync-queue item would re-push it explicitly.
   */
  async deleteLocalMetadata(date: string): Promise<void> {
    await Promise.all([
      diaryCacheDB.delete(date),
      diaryCacheDB.deleteDocument(date),
      diaryCacheDB.deleteSyncItem(date),
      diaryCacheDB.deleteSyncIndex(date),
    ]);
    removeFromTimelineCache(date);
  },

  /**
   * Background sync local cache with the server database
   */
  async syncDiaryCache(
    masterKey: CryptoKey,
    localToday: string,
    onProgress?: (current: number, total: number) => void,
  ): Promise<boolean> {
    if (pullInFlight) return pullInFlight;
    const run = this.runPull(masterKey, localToday, onProgress);
    pullInFlight = run;
    try {
      return await run;
    } finally {
      if (pullInFlight === run) pullInFlight = null;
    }
  },

  async runPull(
    masterKey: CryptoKey,
    // Kept for API compatibility: the bulk pull no longer needs the viewer's
    // local date (it was only used to pick the single-entry cache TTL).
    _localToday: string,
    onProgress?: (current: number, total: number) => void,
  ): Promise<boolean> {
    try {
      // 1. Fetch server dates and updatedAt stamps, plus dates with pending local edits.
      const [res, syncItems] = await Promise.all([
        getEntrySyncListAction(),
        diaryCacheDB.getAllSyncItems(),
      ]);
      if (!res.success || !res.data) {
        console.error("Failed to fetch sync list from server:", res.error);
        return false;
      }
      const serverEntries = res.data; // array of { date: string, updatedAt: string }
      const pendingDates = new Set(syncItems.map((item) => item.key));

      // Fast path: the server sync list is unchanged since the last full pull
      // and there are no pending local edits — skip the O(N) local decrypt and
      // per-entry fetch entirely. The sync list is version-keyed server-side,
      // so an identical fingerprint means there is genuinely nothing to do.
      const fingerprint = syncListFingerprint(serverEntries);
      if (
        lastServerSyncFingerprint &&
        lastServerSyncFingerprint.key === masterKey &&
        lastServerSyncFingerprint.fingerprint === fingerprint &&
        pendingDates.size === 0
      ) {
        return true;
      }

      // 2. Read the plaintext sync index (no decryption). A pull must never
      //    touch AES just to compare timestamps; the index holds only fields
      //    Mongo already stores in plaintext.
      let localIndex = await diaryCacheDB.getAllSyncIndex();
      if (localIndex.length === 0) {
        // Devices upgrading from a build that predates the index: derive it
        // once from the existing encrypted metadata. Decrypting ~N small
        // records locally is far cheaper (and quieter on Atlas) than treating
        // the whole journal as missing and re-fetching every entry.
        const metadataKeys = await diaryCacheDB.getAllKeys();
        if (metadataKeys.length > 0) {
          await this.getLocalCacheTimeline(masterKey);
          localIndex = await diaryCacheDB.getAllSyncIndex();
        }
      }

      const localMap: Record<string, string> = {};
      for (const row of localIndex) {
        // Records written by older code (before the current metadata version)
        // are treated as stale so they are re-fetched once.
        localMap[row.date] =
          row.v === METADATA_VERSION ? row.updatedAt : "";
      }

      // 3. Prune entries deleted on other devices (never prune pending local
      //    edits). All stores are purged so nothing resurrects locally. The
      //    queue is re-checked per date immediately before deleting: an entry
      //    created (or edited) while this pull was in flight cannot be in the
      //    start-of-run snapshot, and pruning its queue item would destroy it.
      const serverDates = new Set(serverEntries.map((e) => e.date));
      // Never prune a record that was written very recently: a flush can
      // consume its sync item just before the cloud write becomes visible in
      // the sync list, and deleting it then loses an entry the user saw as
      // "Saved · Synced". Two weeks of age is irrelevant; 15 minutes is a
      // generous boundary for eventual consistency.
      const PRUNE_GRACE_MS = 15 * 60 * 1000;
      const pruneKeys = Object.keys(localMap).filter((date) => {
        if (serverDates.has(date) || pendingDates.has(date)) return false;
        const localUpdatedAt = new Date(localMap[date] ?? "").getTime();
        if (!Number.isFinite(localUpdatedAt)) return false;
        return Date.now() - localUpdatedAt > PRUNE_GRACE_MS;
      });
      for (const date of pruneKeys) {
        const nowPending = await diaryCacheDB.getSyncItem(date);
        if (nowPending) continue;
        await diaryCacheDB.delete(date);
        await diaryCacheDB.deleteDocument(date);
        await diaryCacheDB.deleteSyncItem(date);
        await diaryCacheDB.deleteSyncIndex(date);
        removeFromTimelineCache(date);
      }

      // 4. Identify entries to fetch (missing or updated on server, excluding
      //    locally-pending edits which are pushed to the cloud instead)
      const fetchList = serverEntries.filter((serverItem) => {
        if (pendingDates.has(serverItem.date)) return false;
        const localUpdatedAt = localMap[serverItem.date];
        if (!localUpdatedAt) return true; // missing locally
        // Compare timestamps
        return (
          new Date(serverItem.updatedAt).getTime() !==
          new Date(localUpdatedAt).getTime()
        );
      });

      if (fetchList.length === 0) {
        lastServerSyncFingerprint = { key: masterKey, fingerprint };
        return true; // No sync needed
      }

      // 5. Fetch dirty entries in bulk chunks. One server action now returns up
      //    to BULK_FETCH_LIMIT entries, replacing the old one-action-per-date
      //    pull (a first sync of 120 entries used to be 120 round-trips).
      const BULK_FETCH_LIMIT = 50;
      let completedCount = 0;
      let failedCount = 0;
      onProgress?.(0, fetchList.length);

      for (let i = 0; i < fetchList.length; i += BULK_FETCH_LIMIT) {
        const chunk = fetchList.slice(i, i + BULK_FETCH_LIMIT);
        let bulkEntries: ServerEntryPayload[] = [];

        try {
          const bulk = await getEntriesBulkAction(
            chunk.map((item) => item.date),
          );
          if (bulk.success && bulk.data) {
            bulkEntries = bulk.data as ServerEntryPayload[];
          } else {
            console.error("Failed to fetch entry batch:", bulk.error);
          }
        } catch (e) {
          console.error("Failed to fetch entry batch:", e);
        }

        const byDate = new Map(
          bulkEntries.map((entry) => [entry.date, entry]),
        );

        for (const item of chunk) {
          const entry = byDate.get(item.date);
          if (!entry) {
            // Whole batch failed, or the entry vanished between the sync list
            // and the fetch. Leave it out of the fingerprint so it retries.
            failedCount++;
            completedCount++;
            onProgress?.(completedCount, fetchList.length);
            continue;
          }

          try {
            await this.ingestServerEntry(entry, masterKey);
          } catch (e) {
            failedCount++;
            console.error(`Failed to sync entry for ${item.date}:`, e);
          } finally {
            completedCount++;
            onProgress?.(completedCount, fetchList.length);
          }
        }
      }

      // Commit the fast-path fingerprint only when every entry synced
      // cleanly — otherwise subsequent pulls would skip re-fetching the
      // failed entries until the server list changes or a re-unlock.
      if (failedCount === 0) {
        lastServerSyncFingerprint = { key: masterKey, fingerprint };
        return true;
      }
      return false;
    } catch (err) {
      console.error("Cache synchronization failed:", err);
      return false;
    }
  },

  /**
   * Applies one server entry to the local cache: decrypt its fields, re-check
   * the pending queue, then write the document, metadata and sync index.
   * Extracted from the pull loop so the bulk path stays readable.
   */
  async ingestServerEntry(
    entry: ServerEntryPayload,
    masterKey: CryptoKey,
  ): Promise<void> {
    const title = await decryptText(entry.title, masterKey);
    const contentText = await decryptText(entry.contentText, masterKey);

    let contentHtml = "";
    let contentJson = {};
    try {
      contentHtml = await decryptText(entry.contentHtml, masterKey);
      const contentJsonRaw = await decryptText(entry.contentJson, masterKey);
      contentJson = JSON.parse(contentJsonRaw);
    } catch (err) {
      console.error("Failed to decrypt full document content fields:", err);
    }

    // Re-check the pending queue immediately before writing: the user may have
    // started editing this date while the bulk fetch was in flight. Never
    // clobber a locally-pending edit.
    const nowPending = await diaryCacheDB.getSyncItem(entry.date);
    if (nowPending) return;

    await this.saveLocalDocument(
      entry.date,
      title,
      entry.mood,
      contentHtml,
      contentText,
      contentJson,
      masterKey,
      entry.notebookId,
    );

    await this.saveLocalMetadata(
      entry.date,
      title,
      contentText,
      entry.wordCount,
      entry.mood,
      entry.updatedAt,
      masterKey,
      entry.notebookId,
    );
  },

  /**
   * Encrypts and saves a full document locally in IndexedDB
   */
  async saveLocalDocument(
    date: string,
    title: string,
    mood: number | null,
    contentHtml: string,
    contentText: string,
    contentJson: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    masterKey: CryptoKey,
    notebookId?: string | null,
  ): Promise<void> {
    const payload = {
      date,
      title,
      mood,
      contentHtml,
      contentText,
      contentJson,
      notebookId: notebookId ?? undefined,
    };
    const encrypted = await encryptText(JSON.stringify(payload), masterKey);
    await diaryCacheDB.setDocument(date, encrypted);
  },

  /**
   * Reads and decrypts a cached full document
   */
  async getLocalDocument(
    date: string,
    masterKey: CryptoKey,
  ): Promise<{
    date: string;
    title: string;
    mood: number | null;
    contentHtml: string;
    contentText: string;
    contentJson: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    notebookId?: string;
  } | null> {
    try {
      const encrypted = await diaryCacheDB.getDocument(date);
      if (!encrypted) return null;
      const decryptedStr = await decryptText(encrypted, masterKey);
      return JSON.parse(decryptedStr);
    } catch (err) {
      console.error(
        `Failed to read/decrypt local document cache for ${date}:`,
        err,
      );
      return null;
    }
  },

  /**
   * Enqueues an entry update in the offline sync queue
   */
  async enqueueOfflineSync(
    date: string,
    payload: {
      date: string;
      title: string;
      mood: number | null;
      contentHtml: string;
      contentText: string;
      contentJson: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      wordCount: number;
      /** Filing target for new entries (v3+ payloads). */
      notebookId?: string;
    },
    masterKey: CryptoKey,
  ): Promise<void> {
    const encrypted = await encryptText(JSON.stringify(payload), masterKey);
    await diaryCacheDB.setSyncItem(date, encrypted);
  },

  /**
   * Removes a single item from the offline sync queue
   */
  async removeOfflineSync(date: string): Promise<void> {
    try {
      await diaryCacheDB.deleteSyncItem(date);
    } catch (err) {
      console.error(`Failed to remove offline sync item for ${date}:`, err);
    }
  },

  /**
   * Flushes all queued offline sync items to the server, reporting which dates
   * succeeded and which failed (failed items stay queued for a later retry).
   */
  async flushOfflineSyncQueue(
    masterKey: CryptoKey,
    localToday: string,
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];
    try {
      const queuedItems = await diaryCacheDB.getAllSyncItems();
      if (queuedItems.length === 0) return { succeeded, failed };

      console.info(`Flushing ${queuedItems.length} pending sync items...`);
      for (const item of queuedItems) {
        try {
          const decryptedStr = await decryptText(item.value, masterKey);
          const payload = JSON.parse(decryptedStr);

          // Re-encrypt fields using the server master key representation.
          // Four independent AES operations — run them together.
          const [serverTitle, serverHtml, serverText, serverJson] =
            await Promise.all([
              encryptText(payload.title, masterKey),
              encryptText(payload.contentHtml, masterKey),
              encryptText(payload.contentText, masterKey),
              encryptText(JSON.stringify(payload.contentJson), masterKey),
            ]);

          const result = await saveEntryAction(
            {
              date: payload.date,
              title: serverTitle,
              mood: payload.mood,
              contentHtml: serverHtml,
              contentText: serverText,
              contentJson: serverJson,
              wordCount: payload.wordCount,
              notebookId: payload.notebookId,
            },
            localToday,
          );

          if (result.success && result.data) {
            // Compare-and-delete: while the save round-trip was in flight,
            // autosave may have enqueued a NEWER payload for this date. Only
            // consume the queue item (and stamp local metadata) when it is
            // still exactly the version that was flushed; otherwise leave the
            // newer edit queued for the next run.
            const current = await diaryCacheDB.getSyncItem(item.key);
            if (!current || current === item.value) {
              await this.removeOfflineSync(payload.date);
              await this.saveLocalMetadata(
                payload.date,
                payload.title,
                payload.contentText,
                payload.wordCount,
                payload.mood,
                result.data.updatedAt,
                masterKey,
                // Server truth wins — an unknown filing id was coerced to
                // the default notebook server-side.
                result.data.notebookId,
              );
              succeeded.push(payload.date);
            }
          } else {
            failed.push(payload.date);
          }
        } catch (e) {
          console.error(
            `Failed to flush pending sync item for ${item.key}:`,
            e,
          );
          failed.push(item.key);
        }
      }
    } catch (err) {
      console.error("Failed to flush pending sync queue:", err);
    }
    return { succeeded, failed };
  },
};
