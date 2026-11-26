import type { LocalProfile, NotebookSummary } from "@withink/core";
import type { LocalStore } from "@withink/core/storage";
import type { SyncIndexRecord } from "@withink/core/sync";

import { diaryCacheDB } from "./diary-cache-db";

/**
 * IndexedDB implementation of the shared `LocalStore` contract.
 *
 * Shared sync/domain code depends on the interface, not on IndexedDB. The
 * native client provides a SQLite implementation of the same shape, which is
 * what lets both clients run identical sync behavior.
 */
export const indexedDbLocalStore: LocalStore = {
  getMetadata: (key) => diaryCacheDB.get(key),
  getAllMetadata: () => diaryCacheDB.getAllEntries(),
  putMetadata: (key, value) => diaryCacheDB.set(key, value),
  deleteMetadata: (key) => diaryCacheDB.delete(key),

  getDocument: (key) => diaryCacheDB.getDocument(key),
  putDocument: (key, value) => diaryCacheDB.setDocument(key, value),
  deleteDocument: (key) => diaryCacheDB.deleteDocument(key),

  getSyncItem: (key) => diaryCacheDB.getSyncItem(key),
  getAllSyncItems: () => diaryCacheDB.getAllSyncItems(),
  putSyncItem: (key, value) => diaryCacheDB.setSyncItem(key, value),
  deleteSyncItem: (key) => diaryCacheDB.deleteSyncItem(key),

  getSyncIndex: () => diaryCacheDB.getAllSyncIndex(),
  putSyncIndex: (record: SyncIndexRecord) => diaryCacheDB.putSyncIndex(record),
  deleteSyncIndex: (key) => diaryCacheDB.deleteSyncIndex(key),

  getProfile: (): Promise<LocalProfile | null> => diaryCacheDB.getProfile(),
  putProfile: (profile: LocalProfile) => diaryCacheDB.putProfile(profile),
  getNotebooks: (): Promise<NotebookSummary[]> => diaryCacheDB.getNotebooks(),
  putNotebooks: (notebooks: NotebookSummary[]) =>
    diaryCacheDB.putNotebooks(notebooks),

  clear: () => diaryCacheDB.clear(),
};
