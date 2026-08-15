import { decryptText, encryptText } from "@/lib/crypto-client";
import { diaryCacheDB } from "@/lib/diary-cache-db";
import { addDays } from "@/lib/utils/date";

import {
  getEntryAction,
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
  updatedAt: string;
  /** Schema version so `syncDiaryCache` can re-fetch records written by older code. */
  v: number;
}

const METADATA_VERSION = 2;

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
// instant after the first one, and is invalidated on any write. Keyed by the
// key object so a new unlock (new key) automatically rebuilds it, and it is
// cleared on lock to release plaintext from memory.
let timelineCache: { key: CryptoKey; entries: CachedMetadata[] } | null = null;

function invalidateTimelineCache(): void {
  timelineCache = null;
}

export interface LocalTimelineFilters {
  moodFilter?: number | "all";
  timeFilter?: "all" | "week" | "month";
  search?: string;
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
    localToday,
  } = filters;

  let filtered = cached;

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
      const searchText = item.contentText || item.snippet;
      if (item.title.toLowerCase().includes(queryLower)) return true;
      if (searchText.toLowerCase().includes(queryLower)) return true;
      if (item.date.includes(queryLower)) return true;

      // Human-readable date matching ("Jul 1", "January 2025", "jul 1, 2025")
      const [year, month, day] = item.date.split("-").map(Number);
      if (year !== undefined && month !== undefined && day !== undefined) {
        const dateObj = new Date(year, month - 1, day);
        const shortDate = dateObj
          .toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          .toLowerCase();
        const longDate = dateObj
          .toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
          .toLowerCase();
        if (shortDate.includes(queryLower) || longDate.includes(queryLower)) {
          return true;
        }
      }

      return false;
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
      updatedAt: updatedAtStr,
      v: METADATA_VERSION,
    };

    const encrypted = await encryptText(JSON.stringify(payload), masterKey);
    await diaryCacheDB.set(date, encrypted);
    invalidateTimelineCache();
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
      const result = (decrypted.filter(Boolean) as CachedMetadata[]).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
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
  },

  /**
   * Deletes a record from the local cache
   */
  async deleteLocalMetadata(date: string): Promise<void> {
    await diaryCacheDB.delete(date);
    invalidateTimelineCache();
  },

  /**
   * Background sync local cache with the server database
   */
  async syncDiaryCache(
    masterKey: CryptoKey,
    localToday: string,
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

      // In-memory timeline is now stale (metadata will change during this sync).
      invalidateTimelineCache();

      // 2. Fetch all local entries and decrypt to build a local map
      const localEntriesRaw = await diaryCacheDB.getAllEntries();
      const localMap: Record<string, string> = {};

      await Promise.all(
        localEntriesRaw.map(async (entry) => {
          try {
            const decryptedStr = await decryptText(entry.value, masterKey);
            const parsed = JSON.parse(decryptedStr) as CachedMetadata;
            // Records written by older code (before full-text metadata) have no
            // `v: 2` marker; treat them as stale so they are re-fetched once.
            localMap[entry.key] = parsed.v === METADATA_VERSION ? parsed.updatedAt : "";
          } catch {
            // If decryption fails, mark it as empty so it gets re-fetched
            localMap[entry.key] = "";
          }
        }),
      );

      // 3. Prune entries deleted on other devices (never prune pending local edits)
      const serverDates = new Set(serverEntries.map((e) => e.date));
      const pruneKeys = Object.keys(localMap).filter(
        (date) => !serverDates.has(date) && !pendingDates.has(date),
      );
      for (const date of pruneKeys) {
        await diaryCacheDB.delete(date);
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
        return true; // No sync needed
      }

      // 5. Fetch dirty entries in small concurrent chunks to prevent throttling
      const CONCURRENCY_LIMIT = 5;
      let completedCount = 0;
      onProgress?.(0, fetchList.length);

      for (let i = 0; i < fetchList.length; i += CONCURRENCY_LIMIT) {
        const chunk = fetchList.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(
          chunk.map(async (item) => {
            try {
              const resEntry = await getEntryAction(item.date, localToday);
              if (resEntry.success && resEntry.data) {
                const entry = resEntry.data;

                // Decrypt fields locally
                const title = await decryptText(entry.title, masterKey);
                const contentText = await decryptText(
                  entry.contentText,
                  masterKey,
                );

                let contentHtml = "";
                let contentJson = {};
                try {
                  contentHtml = await decryptText(entry.contentHtml, masterKey);
                  const contentJsonRaw = await decryptText(
                    entry.contentJson,
                    masterKey,
                  );
                  contentJson = JSON.parse(contentJsonRaw);
                } catch (err) {
                  console.error(
                    "Failed to decrypt full document content fields:",
                    err,
                  );
                }

                await this.saveLocalDocument(
                  entry.date,
                  title,
                  entry.mood,
                  contentHtml,
                  contentText,
                  contentJson,
                  masterKey,
                );

                await this.saveLocalMetadata(
                  entry.date,
                  title,
                  contentText,
                  entry.wordCount,
                  entry.mood,
                  entry.updatedAt,
                  masterKey,
                );
              }
            } catch (e) {
              console.error(`Failed to sync entry for ${item.date}:`, e);
            } finally {
              completedCount++;
              onProgress?.(completedCount, fetchList.length);
            }
          }),
        );
      }

      return true;
    } catch (err) {
      console.error("Cache synchronization failed:", err);
      return false;
    }
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
  ): Promise<void> {
    const payload = {
      date,
      title,
      mood,
      contentHtml,
      contentText,
      contentJson,
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

          // Re-encrypt fields using the server master key representation
          const serverTitle = await encryptText(payload.title, masterKey);
          const serverHtml = await encryptText(payload.contentHtml, masterKey);
          const serverText = await encryptText(payload.contentText, masterKey);
          const serverJson = await encryptText(
            JSON.stringify(payload.contentJson),
            masterKey,
          );

          const result = await saveEntryAction(
            {
              date: payload.date,
              title: serverTitle,
              mood: payload.mood,
              contentHtml: serverHtml,
              contentText: serverText,
              contentJson: serverJson,
              wordCount: payload.wordCount,
            },
            localToday,
          );

          if (result.success && result.data) {
            // Delete from queue and update local metadata/document timestamps
            await this.removeOfflineSync(payload.date);
            await this.saveLocalMetadata(
              payload.date,
              payload.title,
              payload.contentText,
              payload.wordCount,
              payload.mood,
              result.data.updatedAt,
              masterKey,
            );
            succeeded.push(payload.date);
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
