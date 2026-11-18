import type {
  NotebookSummary,
  SaveEntryPayload,
  SaveEntryResult,
  SyncEntryPayload,
  SyncListItem,
  SyncPushRejection,
} from "@withink/core";

export interface SyncManifestResponse {
  entries: SyncListItem[];
}

export interface SyncPullRequest {
  dates: string[];
}

export interface SyncPullResponse {
  entries: SyncEntryPayload[];
}

export interface SyncPushRequest {
  entries: SaveEntryPayload[];
}

export interface SyncPushResponse {
  saved: SaveEntryResult[];
  rejected: SyncPushRejection[];
}

export interface SyncDeleteRequest {
  date: string;
}

export interface SyncDeleteResponse {
  success: boolean;
}

export interface SyncNotebooksResponse {
  notebooks: NotebookSummary[];
}

export interface ApiClientOptions {
  /** e.g. "https://app.withink.me" (no trailing slash required). */
  baseUrl: string;
  /** Injectable for tests / non-standard runtimes. Defaults to global fetch. */
  fetch?: typeof fetch;
  /**
   * Auth headers per request. Web can rely on cookies with
   * `credentials: "include"`; native supplies `Authorization: Bearer …`.
   */
  getHeaders?: () =>
    | Promise<Record<string, string>>
    | Record<string, string>;
  /** Defaults to "include" so the web app sends its session cookie. */
  credentials?: RequestCredentials;
}

export interface WithinkApiClient {
  getSyncList(): Promise<SyncListItem[]>;
  getEntries(dates: string[]): Promise<SyncEntryPayload[]>;
  saveEntries(
    entries: SaveEntryPayload[],
  ): Promise<{ saved: SaveEntryResult[]; rejected: SyncPushRejection[] }>;
  /** Convenience single-entry save; throws `SyncRejectedError` on rejection. */
  saveEntry(payload: SaveEntryPayload): Promise<SaveEntryResult>;
  deleteEntry(date: string): Promise<boolean>;
  getNotebooks(): Promise<NotebookSummary[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** A server-authoritative rejection (e.g. out-of-window entry at sync time). */
export class SyncRejectedError extends Error {
  readonly date: string;

  constructor(date: string, reason: string) {
    super(reason);
    this.name = "SyncRejectedError";
    this.date = date;
  }
}
