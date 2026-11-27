import type {
  ApiErrorBody,
  BillingSummaryView,
  EncryptionMutationRequest,
  EncryptionSettingsView,
  LetterFull,
  LetterMeta,
  LockSettingsView,
  MediaLibraryResponse,
  MediaUploadRequest,
  MediaUploadResponse,
  MobileBootstrap,
  NotificationSettingsRequest,
  NotificationSettingsView,
  RegisterPushDeviceRequest,
  SaveLetterRequest,
  UnlockResponse,
  UpdateLockSettingsRequest,
} from "@withink/contracts";
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
  BillingSummaryView,
  EncryptionMutationRequest,
  EncryptionSettingsView,
  LetterFull,
  LetterMeta,
  LockSettingsView,
  MediaFileView,
  MediaLibraryResponse,
  MediaStorageStats,
  MediaUploadRequest,
  MediaUploadResponse,
  NotificationSettingsRequest,
  NotificationSettingsView,
  RegisterPushDeviceRequest,
  SaveLetterRequest,
  SyncDeleteRequest,
  SyncDeleteResponse,
  SyncManifestResponse,
  SyncNotebookMutationResponse,
  SyncNotebooksResponse,
  SyncPullRequest,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  UpdateLockSettingsRequest,
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
  /** Encryption/lock settings for a native unlock. */
  getBootstrap(): Promise<MobileBootstrap>;
  /** Exchanges the client-derived HKDF proof for a short-lived token. */
  unlock(proof: string): Promise<UnlockResponse>;
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

  // Account surface (native settings, letters, reminders, billing).

  getLockSettings(): Promise<LockSettingsView>;
  saveLockSettings(input: UpdateLockSettingsRequest): Promise<void>;
  /** Emails the six-digit lock-recovery code; nothing is returned. */
  requestPasscodeResetEmail(): Promise<void>;

  getEncryptionSettings(): Promise<EncryptionSettingsView>;
  /** Enables ZK (migration) or re-wraps the master key with a new password. */
  mutateEncryption(input: EncryptionMutationRequest): Promise<void>;

  getLetters(): Promise<{ letters: LetterMeta[]; today: string }>;
  getLetter(id: string): Promise<{ letter: LetterFull; today: string }>;
  /** Creates or auto-saves; throws `ApiError` with the rule code on limits. */
  saveLetter(input: SaveLetterRequest): Promise<LetterFull>;
  sealLetter(id: string): Promise<LetterFull>;
  /** Throws `ApiError` with `LETTER_SEALED` when opened early. */
  revealLetter(id: string): Promise<LetterFull>;
  deleteLetter(id: string): Promise<void>;

  getNotificationSettings(): Promise<NotificationSettingsView>;
  saveNotificationSettings(
    input: NotificationSettingsRequest,
  ): Promise<void>;
  /** Registers this install's Expo push token. */
  registerPushDevice(input: RegisterPushDeviceRequest): Promise<void>;
  unregisterPushDevice(token: string): Promise<void>;

  /** Journal media library + quota, newest first. */
  getMediaLibrary(): Promise<MediaLibraryResponse>;
  /** Presigns one image upload (quota failures surface as `STORAGE_QUOTA_EXCEEDED`). */
  createMediaUpload(input: MediaUploadRequest): Promise<MediaUploadResponse>;
  /** Deletes one object the caller owns; callers must scrub entry references first. */
  deleteMedia(key: string): Promise<void>;

  /** Read-only plan state; no checkout/portal URLs on native. */
  getBillingSummary(): Promise<BillingSummaryView>;
  /** Irreversible; credential accounts must supply the login password. */
  deleteAccount(password?: string): Promise<void>;
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
