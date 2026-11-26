import type { LocalProfile, NotebookSummary, StoredRecord, SyncIndexRecord } from "@withink/core";

import type { MobileLocalStore } from "./sqlite-store";

/**
 * In-memory `LocalStore` used on Expo web and in Node tests.
 *
 * Native always resolves `local-store.native.ts` (SQLite). This fallback keeps
 * the same contract so the cache/sync service is testable and the app has a
 * working store anywhere `expo-sqlite` is unavailable.
 */
export function createMemoryLocalStore(): MobileLocalStore {
  const stores = new Map<string, Map<string, string>>();

  function bucket(name: string): Map<string, string> {
    let store = stores.get(name);
    if (!store) {
      store = new Map();
      stores.set(name, store);
    }
    return store;
  }

  function readAll(name: string): StoredRecord[] {
    return [...bucket(name)].map(([key, value]) => ({ key, value }));
  }

  function readJson<T>(name: string, key: string): T | null {
    const value = bucket(name).get(key);
    if (value === undefined) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return {
    async getMetadata(key) {
      return bucket("metadata").get(key) ?? null;
    },
    async getAllMetadata() {
      return readAll("metadata");
    },
    async putMetadata(key, value) {
      bucket("metadata").set(key, value);
    },
    async deleteMetadata(key) {
      bucket("metadata").delete(key);
    },

    async getDocument(key) {
      return bucket("document").get(key) ?? null;
    },
    async putDocument(key, value) {
      bucket("document").set(key, value);
    },
    async deleteDocument(key) {
      bucket("document").delete(key);
    },

    async getSyncItem(key) {
      return bucket("sync_queue").get(key) ?? null;
    },
    async getAllSyncItems() {
      return readAll("sync_queue");
    },
    async putSyncItem(key, value) {
      bucket("sync_queue").set(key, value);
    },
    async deleteSyncItem(key) {
      bucket("sync_queue").delete(key);
    },

    async getSyncIndex() {
      return readAll("sync_index")
        .map((row) => {
          try {
            return JSON.parse(row.value) as SyncIndexRecord;
          } catch {
            return null;
          }
        })
        .filter((row): row is SyncIndexRecord => row !== null);
    },
    async putSyncIndex(record) {
      bucket("sync_index").set(record.date, JSON.stringify(record));
    },
    async deleteSyncIndex(key) {
      bucket("sync_index").delete(key);
    },

    async getProfile() {
      return readJson<LocalProfile>("profile", "current");
    },
    async putProfile(profile) {
      bucket("profile").set("current", JSON.stringify(profile));
    },
    async getNotebooks() {
      return readJson<NotebookSummary[]>("notebooks", "current") ?? [];
    },
    async putNotebooks(notebooks) {
      bucket("notebooks").set("current", JSON.stringify(notebooks));
    },

    async clear() {
      stores.clear();
    },

    async clearEntries() {
      for (const name of [
        "metadata",
        "document",
        "sync_queue",
        "sync_index",
        "notebooks",
      ]) {
        stores.delete(name);
      }
    },
  };
}
