// Browser-compatible native IndexedDB wrapper for Withink cache storage
// Version 2: Added document_cache and sync_queue stores for full offline support

const DB_NAME = "diary_cache";
const STORE_NAME = "metadata_cache";
const DOCUMENT_STORE = "document_cache";
const SYNC_STORE = "sync_queue";
const DB_VERSION = 2;

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

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_NAME, DOCUMENT_STORE, SYNC_STORE],
        "readwrite",
      );
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(DOCUMENT_STORE).clear();
      transaction.objectStore(SYNC_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};
