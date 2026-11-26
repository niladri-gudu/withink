// Browser-compatible native IndexedDB wrapper for Withink cache storage
// Version 2: Added document_cache and sync_queue stores for full offline support

import type { LocalProfile, NotebookSummary } from "@withink/core";
import type { SyncIndexRecord } from "@withink/core/sync";

import { requestPersistentStorage } from "@/lib/persistent-storage";

// Re-exported for existing consumers; the shape now lives in `@withink/core`.
export type { SyncIndexRecord };

const DB_NAME = "diary_cache";
const STORE_NAME = "metadata_cache";
const DOCUMENT_STORE = "document_cache";
const SYNC_STORE = "sync_queue";
// v3: plaintext sync index. Lets a pull diff local vs. server by date without
// decrypting every entry. Holds only fields Mongo already stores in plaintext
// (date, updatedAt, schema version) — never journal content.
const SYNC_INDEX_STORE = "sync_index";
// v4: on-device identity/profile cache (encryption + lock settings + display
// hint), so the shell can eventually bootstrap without a server read.
const PROFILE_STORE = "profile";
// v5: cached notebook summaries, so the editor/timeline can file entries
// without a server read. Derived data — rebuilt from the sync API.
const NOTEBOOK_STORE = "notebooks";
const DB_VERSION = 5;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      // The cache is now in real use: ask for eviction protection.
      void requestPersistentStorage();
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
        db.createObjectStore(DOCUMENT_STORE);
      }
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE);
      }
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE);
      }
      if (!db.objectStoreNames.contains(SYNC_INDEX_STORE)) {
        db.createObjectStore(SYNC_INDEX_STORE);
      }
      if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) {
        db.createObjectStore(NOTEBOOK_STORE);
      }
    };
  });
  // Cache only settled-successful connections: a rejected open (SSR call,
  // transient failure) must not poison every future operation.
  dbPromise = opening.then(
    () => opening,
    (err) => {
      if (dbPromise === opening) dbPromise = null;
      throw err;
    },
  );
  return dbPromise;
}

export const diaryCacheDB = {
  // Metadata Store Helpers
  async get(key: string): Promise<string | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (err) {
      console.error("IndexedDB get error:", err);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async delete(key: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error("IndexedDB delete error:", err);
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve((request.result as string[]) || []);
        };
      });
    } catch (err) {
      console.error("IndexedDB getAllKeys error:", err);
      return [];
    }
  },

  async getAllEntries(): Promise<{ key: string; value: string }[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);

        const entries: { key: string; value: string }[] = [];
        const request = store.openCursor();

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
            .result;
          if (cursor) {
            entries.push({
              key: cursor.primaryKey as string,
              value: cursor.value as string,
            });
            cursor.continue();
          } else {
            resolve(entries);
          }
        };
      });
    } catch (err) {
      console.error("IndexedDB getAllEntries error:", err);
      return [];
    }
  },

  // Document Cache Helpers (using DOCUMENT_STORE)
  async getDocument(key: string): Promise<string | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(DOCUMENT_STORE, "readonly");
        const store = transaction.objectStore(DOCUMENT_STORE);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (err) {
      console.error("IndexedDB getDocument error:", err);
      return null;
    }
  },

  async setDocument(key: string, value: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(DOCUMENT_STORE, "readwrite");
        const store = transaction.objectStore(DOCUMENT_STORE);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      // Writes must reject: the document store is part of the durability
      // guarantee. Swallowing here would let autosave report "synced" while
      // nothing was stored.
      console.error("IndexedDB setDocument error:", err);
      throw err;
    }
  },

  async deleteDocument(key: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(DOCUMENT_STORE, "readwrite");
        const store = transaction.objectStore(DOCUMENT_STORE);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error("IndexedDB deleteDocument error:", err);
    }
  },

  // Sync Queue Helpers (using SYNC_STORE)
  async getSyncItem(key: string): Promise<string | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_STORE, "readonly");
        const store = transaction.objectStore(SYNC_STORE);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (err) {
      console.error("IndexedDB getSyncItem error:", err);
      return null;
    }
  },

  async setSyncItem(key: string, value: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_STORE, "readwrite");
        const store = transaction.objectStore(SYNC_STORE);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      // Writes must reject: a dropped queue item would silently lose the
      // cloud push for that entry.
      console.error("IndexedDB setSyncItem error:", err);
      throw err;
    }
  },

  async deleteSyncItem(key: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_STORE, "readwrite");
        const store = transaction.objectStore(SYNC_STORE);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error("IndexedDB deleteSyncItem error:", err);
    }
  },

  async getAllSyncItems(): Promise<{ key: string; value: string }[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE, "readonly");
      const store = transaction.objectStore(SYNC_STORE);

      const entries: { key: string; value: string }[] = [];
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
          .result;
        if (cursor) {
          entries.push({
            key: cursor.primaryKey as string,
            value: cursor.value as string,
          });
          cursor.continue();
        } else {
          resolve(entries);
        }
      };
    });
  },

  // Cached notebook summaries (derived; one "current" record).
  async getNotebooks(): Promise<NotebookSummary[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTEBOOK_STORE, "readonly");
        const store = transaction.objectStore(NOTEBOOK_STORE);
        const request = store.get("current");

        request.onerror = () => reject(request.error);
        request.onsuccess = () =>
          resolve((request.result as NotebookSummary[]) || []);
      });
    } catch (err) {
      console.error("IndexedDB getNotebooks error:", err);
      return [];
    }
  },

  async putNotebooks(notebooks: NotebookSummary[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(NOTEBOOK_STORE, "readwrite");
        const store = transaction.objectStore(NOTEBOOK_STORE);
        const request = store.put(notebooks, "current");

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      // Derived data; a failed write must not break the caller.
      console.error("IndexedDB putNotebooks error:", err);
    }
  },

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [
          STORE_NAME,
          DOCUMENT_STORE,
          SYNC_STORE,
          SYNC_INDEX_STORE,
          PROFILE_STORE,
          NOTEBOOK_STORE,
        ],
        "readwrite",
      );
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(DOCUMENT_STORE).clear();
      transaction.objectStore(SYNC_STORE).clear();
      transaction.objectStore(SYNC_INDEX_STORE).clear();
      transaction.objectStore(PROFILE_STORE).clear();
      transaction.objectStore(NOTEBOOK_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * Clears the derived entry cache but keeps the local `profile` record.
   *
   * This is the "rebuild local cache" repair path: the journal re-downloads
   * from the encrypted cloud copy, while the wrapped key, salt and diary
   * settings stay on the device so the user is not locked out.
   */
  async clearEntries(): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [
          STORE_NAME,
          DOCUMENT_STORE,
          SYNC_STORE,
          SYNC_INDEX_STORE,
          NOTEBOOK_STORE,
        ],
        "readwrite",
      );
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(DOCUMENT_STORE).clear();
      transaction.objectStore(SYNC_STORE).clear();
      transaction.objectStore(SYNC_INDEX_STORE).clear();
      transaction.objectStore(NOTEBOOK_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // Plaintext sync index (date → { updatedAt, v }).
  async putSyncIndex(record: SyncIndexRecord): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_INDEX_STORE, "readwrite");
      const store = transaction.objectStore(SYNC_INDEX_STORE);
      const request = store.put(record, record.date);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async getAllSyncIndex(): Promise<SyncIndexRecord[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_INDEX_STORE, "readonly");
        const store = transaction.objectStore(SYNC_INDEX_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve((request.result as SyncIndexRecord[]) || []);
        };
      });
    } catch (err) {
      console.error("IndexedDB getAllSyncIndex error:", err);
      return [];
    }
  },

  async getSyncIndex(date: string): Promise<SyncIndexRecord | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_INDEX_STORE, "readonly");
        const store = transaction.objectStore(SYNC_INDEX_STORE);
        const request = store.get(date);

        request.onerror = () => reject(request.error);
        request.onsuccess = () =>
          resolve((request.result as SyncIndexRecord) || null);
      });
    } catch (err) {
      console.error("IndexedDB getSyncIndex error:", err);
      return null;
    }
  },

  async deleteSyncIndex(date: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_INDEX_STORE, "readwrite");
        const store = transaction.objectStore(SYNC_INDEX_STORE);
        const request = store.delete(date);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error("IndexedDB deleteSyncIndex error:", err);
    }
  },

  // Local profile (one "current" record): encryption/lock settings plus a
  // display-only account hint. Derived data — degrade to null on read errors.
  async getProfile(key = "current"): Promise<LocalProfile | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROFILE_STORE, "readonly");
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () =>
          resolve((request.result as LocalProfile) || null);
      });
    } catch (err) {
      console.error("IndexedDB getProfile error:", err);
      return null;
    }
  },

  async putProfile(profile: LocalProfile, key = "current"): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(PROFILE_STORE, "readwrite");
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.put(profile, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      // The profile is derived from the server; a failed write is not fatal.
      console.error("IndexedDB putProfile error:", err);
    }
  },
};
