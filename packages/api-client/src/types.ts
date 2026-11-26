import type { ApiErrorBody } from "@withink/contracts";
import type {
  NotebookSummary,
  SaveEntryPayload,
  SaveEntryResult,
  SyncEntryPayload,
  SyncListItem,
  SyncPushRejection,
} from "@withink/core";

/**
 * Wire shapes live in `@withink/contracts`; re-exported here so existing
 * imports from `@withink/api-client` keep working.
 */
export type {
  SyncDeleteRequest,
  SyncDeleteResponse,
  SyncManifestResponse,
  SyncNotebookMutationResponse,
  SyncNotebooksResponse,
  SyncPullRequest,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "@withink/contracts";

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
  /** Returns the created notebook (server enforces the plan's limit). */
  createNotebook(name: string): Promise<NotebookSummary>;
  renameNotebook(id: string, name: string): Promise<void>;
  deleteNotebook(id: string): Promise<void>;
  setDefaultNotebook(id: string): Promise<void>;
  /** Files an existing entry into another notebook. */
  moveEntryToNotebook(date: string, notebookId: string): Promise<void>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ApiErrorBody["details"];

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: ApiErrorBody["details"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
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
