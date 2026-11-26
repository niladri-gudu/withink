import type {
  LocalProfile,
  LocalStore,
  NotebookSummary,
  StoredRecord,
  SyncIndexRecord,
} from "@withink/core";

/**
 * SQLite implementation of the shared `LocalStore` contract.
 *
 * The web adapter wraps IndexedDB object stores; this adapter keeps the same
 * logical stores in one key/value table so the two clients persist identical
 * records (encrypted metadata, encrypted documents, encrypted sync queue,
 * plaintext sync index, profile, notebooks). The journal format is pinned by
 * the shared code, not by the storage engine.
 *
 * The driver is injected so the adapter can be unit-tested in Node without a
 * device; `local-store.native.ts` wires the `expo-sqlite` driver.
 */

export interface SqlDriver {
  /** Runs one or more statements, no result rows. */
  exec(sql: string): Promise<void>;
  /** Runs a parameterized statement. */
  run(sql: string, params?: unknown[]): Promise<void>;
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

/** Logical store names, mirroring the IndexedDB object stores one-for-one. */
export const SQLITE_STORES = {
  metadata: "metadata",
  document: "document",
  syncQueue: "sync_queue",
  syncIndex: "sync_index",
  profile: "profile",
  notebooks: "notebooks",
} as const;

export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS local_kv (
  store TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (store, key)
);`;

/** The shared contract plus the web adapter's cache-repair helper. */
export interface MobileLocalStore extends LocalStore {
  /** Clears journal entries but keeps the local profile/key wrap. */
  clearEntries(): Promise<void>;
}

const SELECT_VALUE = "SELECT value FROM local_kv WHERE store = ? AND key = ?";
const SELECT_ROWS = "SELECT key, value FROM local_kv WHERE store = ?";
const UPSERT =
  "INSERT OR REPLACE INTO local_kv (store, key, value) VALUES (?, ?, ?)";
const DELETE_ROW = "DELETE FROM local_kv WHERE store = ? AND key = ?";
const DELETE_STORE = "DELETE FROM local_kv WHERE store = ?";
const DELETE_ALL = "DELETE FROM local_kv";

interface Row {
  key: string;
  value: string;
}

export function createSqliteLocalStore(driver: SqlDriver): MobileLocalStore {
  let schemaReady: Promise<void> | null = null;

  function ensureSchema(): Promise<void> {
    schemaReady ??= driver.exec(SQLITE_SCHEMA).catch((err: unknown) => {
      // A rejected open must not poison every future operation.
      schemaReady = null;
      throw err;
    });
    return schemaReady;
  }

  async function read(store: string, key: string): Promise<string | null> {
    try {
      await ensureSchema();
      const row = await driver.getFirst<{ value: string }>(SELECT_VALUE, [
        store,
        key,
      ]);
      return row?.value ?? null;
    } catch (err) {
      console.error(`SQLite read failed for ${store}/${key}:`, err);
      return null;
    }
  }

  async function readAll(store: string): Promise<StoredRecord[]> {
    try {
      await ensureSchema();
      const rows = await driver.getAll<Row>(SELECT_ROWS, [store]);
      return rows.map((row) => ({ key: row.key, value: row.value }));
    } catch (err) {
      console.error(`SQLite readAll failed for ${store}:`, err);
      return [];
    }
  }

  /** Writes reject on failure: the local store is the durability guarantee. */
  async function write(
    store: string,
    key: string,
    value: string,
  ): Promise<void> {
    await ensureSchema();
    await driver.run(UPSERT, [store, key, value]);
  }

  /** Best-effort deletes, matching the web adapter's non-fatal semantics. */
  async function remove(store: string, key: string): Promise<void> {
    try {
      await ensureSchema();
      await driver.run(DELETE_ROW, [store, key]);
    } catch (err) {
      console.error(`SQLite delete failed for ${store}/${key}:`, err);
    }
  }

  async function readJson<T>(store: string, key: string): Promise<T | null> {
    const value = await read(store, key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch (err) {
      console.error(`SQLite JSON parse failed for ${store}/${key}:`, err);
      return null;
    }
  }

  return {
    getMetadata: (key) => read(SQLITE_STORES.metadata, key),
    getAllMetadata: () => readAll(SQLITE_STORES.metadata),
    putMetadata: (key, value) =>
      write(SQLITE_STORES.metadata, key, value),
    deleteMetadata: (key) => remove(SQLITE_STORES.metadata, key),

    getDocument: (key) => read(SQLITE_STORES.document, key),
    putDocument: (key, value) => write(SQLITE_STORES.document, key, value),
    deleteDocument: (key) => remove(SQLITE_STORES.document, key),

    getSyncItem: (key) => read(SQLITE_STORES.syncQueue, key),
    getAllSyncItems: () => readAll(SQLITE_STORES.syncQueue),
    putSyncItem: (key, value) => write(SQLITE_STORES.syncQueue, key, value),
    deleteSyncItem: (key) => remove(SQLITE_STORES.syncQueue, key),

    async getSyncIndex() {
      const rows = await readAll(SQLITE_STORES.syncIndex);
      const records: SyncIndexRecord[] = [];
      for (const row of rows) {
        try {
          records.push(JSON.parse(row.value) as SyncIndexRecord);
        } catch (err) {
          console.error(`SQLite sync index parse failed for ${row.key}:`, err);
        }
      }
      return records;
    },
    async putSyncIndex(record) {
      await write(SQLITE_STORES.syncIndex, record.date, JSON.stringify(record));
    },
    deleteSyncIndex: (key) => remove(SQLITE_STORES.syncIndex, key),

    getProfile: () => readJson<LocalProfile>(SQLITE_STORES.profile, "current"),
    async putProfile(profile) {
      try {
        await write(SQLITE_STORES.profile, "current", JSON.stringify(profile));
      } catch (err) {
        // Derived from the server; a failed write is not fatal.
        console.error("SQLite putProfile failed:", err);
      }
    },
    async getNotebooks() {
      const notebooks = await readJson<NotebookSummary[]>(
        SQLITE_STORES.notebooks,
        "current",
      );
      return notebooks ?? [];
    },
    async putNotebooks(notebooks) {
      try {
        await write(
          SQLITE_STORES.notebooks,
          "current",
          JSON.stringify(notebooks),
        );
      } catch (err) {
        // Derived data; a failed write must not break the caller.
        console.error("SQLite putNotebooks failed:", err);
      }
    },

    async clear() {
      await ensureSchema();
      await driver.exec(DELETE_ALL);
    },

    async clearEntries() {
      await ensureSchema();
      for (const store of [
        SQLITE_STORES.metadata,
        SQLITE_STORES.document,
        SQLITE_STORES.syncQueue,
        SQLITE_STORES.syncIndex,
        SQLITE_STORES.notebooks,
      ]) {
        await driver.run(DELETE_STORE, [store]);
      }
    },
  };
}
