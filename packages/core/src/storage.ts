import type { NotebookSummary, LocalProfile } from "./types";
import type { SyncIndexRecord } from "./sync";

/**
 * The on-device store contract. The web adapter wraps IndexedDB; the native
 * adapter will wrap SQLite. Everything stored here is either ciphertext or
 * non-secret metadata (dates, counts, schema versions, profile settings).
 */

export interface StoredRecord {
  key: string;
  value: string;
}

export interface LocalStore {
  // Encrypted metadata (timeline/search).
  getMetadata(key: string): Promise<string | null>;
  getAllMetadata(): Promise<StoredRecord[]>;
  putMetadata(key: string, value: string): Promise<void>;
  deleteMetadata(key: string): Promise<void>;

  // Encrypted full documents (editor).
  getDocument(key: string): Promise<string | null>;
  putDocument(key: string, value: string): Promise<void>;
  deleteDocument(key: string): Promise<void>;

  // Encrypted pending-write queue.
  getSyncItem(key: string): Promise<string | null>;
  getAllSyncItems(): Promise<StoredRecord[]>;
  putSyncItem(key: string, value: string): Promise<void>;
  deleteSyncItem(key: string): Promise<void>;

  // Plaintext sync index (date + updatedAt + schema version only).
  getSyncIndex(): Promise<SyncIndexRecord[]>;
  putSyncIndex(record: SyncIndexRecord): Promise<void>;
  deleteSyncIndex(key: string): Promise<void>;

  // Local identity and notebook membership.
  getProfile(): Promise<LocalProfile | null>;
  putProfile(profile: LocalProfile): Promise<void>;
  getNotebooks(): Promise<NotebookSummary[]>;
  putNotebooks(notebooks: NotebookSummary[]): Promise<void>;

  clear(): Promise<void>;
}
