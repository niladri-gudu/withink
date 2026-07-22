import { sanctuaryCacheDB } from "@/lib/sanctuary-cache-db";
import { encryptText, decryptText } from "@/lib/crypto-client";
import { getEntrySyncListAction, getEntryAction } from "../actions/entry-actions";

export interface CachedMetadata {
  date: string;
  title: string;
  snippet: string;
  wordCount: number;
  mood: number | null;
  updatedAt: string;
}

/**
 * Extracts a clean text snippet from content text
 */
function createSnippet(text: string, maxLength = 240): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "…" : cleaned;
}

export const sanctuaryCacheService = {
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
    try {
      const updatedAtStr = updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt;
      const snippet = createSnippet(contentText);

      const payload: CachedMetadata = {
        date,
        title: title || "",
        snippet,
        wordCount: wordCount || 0,
        mood,
        updatedAt: updatedAtStr,
      };

      const encrypted = await encryptText(JSON.stringify(payload), masterKey);
      await sanctuaryCacheDB.set(date, encrypted);
    } catch (err) {
      console.error(`Failed to save local metadata cache for ${date}:`, err);
    }
  },

  /**
   * Reads and decrypts all cached metadata records
   */
  async getLocalCacheTimeline(masterKey: CryptoKey): Promise<CachedMetadata[]> {
    try {
      const entries = await sanctuaryCacheDB.getAllEntries();
      const decrypted = await Promise.all(
        entries.map(async (entry) => {
          try {
            const decryptedStr = await decryptText(entry.value, masterKey);
            const parsed = JSON.parse(decryptedStr) as CachedMetadata;
            return parsed;
          } catch (e) {
            console.error(`Failed to decrypt cached entry for ${entry.key}:`, e);
            return null;
          }
        })
      );

      // Filter out failures and sort descending by date
      return (decrypted.filter(Boolean) as CachedMetadata[]).sort((a, b) =>
        b.date.localeCompare(a.date)
      );
    } catch (err) {
      console.error("Failed to load local cache timeline:", err);
      return [];
    }
  },

  /**
   * Deletes a record from the local cache
   */
  async deleteLocalMetadata(date: string): Promise<void> {
    await sanctuaryCacheDB.delete(date);
  },

  /**
   * Background sync local cache with the server database
   */
  async syncSanctuaryCache(
    masterKey: CryptoKey,
    localToday: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<boolean> {
    try {
      // 1. Fetch server dates and updatedAt stamps
      const res = await getEntrySyncListAction();
      if (!res.success || !res.data) {
        console.error("Failed to fetch sync list from server:", res.error);
        return false;
      }
      const serverEntries = res.data; // array of { date: string, updatedAt: string }

      // 2. Fetch all local entries and decrypt to build a local map
      const localEntriesRaw = await sanctuaryCacheDB.getAllEntries();
      const localMap: Record<string, string> = {};

      await Promise.all(
        localEntriesRaw.map(async (entry) => {
          try {
            const decryptedStr = await decryptText(entry.value, masterKey);
            const parsed = JSON.parse(decryptedStr) as CachedMetadata;
            localMap[entry.key] = parsed.updatedAt;
          } catch {
            // If decryption fails, mark it as empty so it gets re-fetched
            localMap[entry.key] = "";
          }
        })
      );

      // 3. Prune entries deleted on other devices
      const serverDates = new Set(serverEntries.map((e) => e.date));
      const pruneKeys = Object.keys(localMap).filter((date) => !serverDates.has(date));
      for (const date of pruneKeys) {
        await sanctuaryCacheDB.delete(date);
      }

      // 4. Identify entries to fetch (missing or updated on server)
      const fetchList = serverEntries.filter((serverItem) => {
        const localUpdatedAt = localMap[serverItem.date];
        if (!localUpdatedAt) return true; // missing locally
        // Compare timestamps
        return new Date(serverItem.updatedAt).getTime() !== new Date(localUpdatedAt).getTime();
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
                const contentText = await decryptText(entry.contentText, masterKey);

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
          })
        );
      }

      return true;
    } catch (err) {
      console.error("Cache synchronization failed:", err);
      return false;
    }
  },
};
