import type { NotebookSummary } from "./types";

/** Max dates per sync request; mirrors the server's `$in` bound. */
export const SYNC_BULK_LIMIT = 50;

export interface SyncListItem {
  date: string;
  updatedAt: string;
}

/** Plaintext sync-index row (date + server timestamp + schema version). */
export interface SyncIndexRecord {
  date: string;
  updatedAt: string;
  v: number;
}

/**
 * Full entry as the client receives it. Content fields are ciphertext for
 * zero-knowledge accounts and are never inspected by the server or API client.
 */
export interface SyncEntryPayload {
  date: string;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson: string;
  wordCount: number;
  mood: number | null;
  notebookId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveEntryPayload {
  date: string;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson: string;
  wordCount: number;
  mood: number | null;
  /** Filing target for NEW entries; the server re-validates ownership. */
  notebookId?: string;
  /** Viewer-local today, used for the backfill window. */
  today: string;
}

export interface SaveEntryResult {
  date: string;
  updatedAt: string;
  notebookId: string | null;
}

export interface SyncPushRejection {
  date: string;
  reason: string;
}

export interface SyncPushResult {
  saved: SaveEntryResult[];
  rejected: SyncPushRejection[];
}

/**
 * Transport contract the sync engine talks to. The web implementation can
 * wrap the existing Server Actions; the native implementation wraps the HTTP
 * API (`@withink/api-client`). The engine itself never imports either.
 */
export interface RemoteApi {
  getSyncList(): Promise<SyncListItem[]>;
  getEntries(dates: string[]): Promise<SyncEntryPayload[]>;
  saveEntry(payload: SaveEntryPayload): Promise<SaveEntryResult>;
  deleteEntry(date: string): Promise<boolean>;
  getNotebooks(): Promise<NotebookSummary[]>;
}
