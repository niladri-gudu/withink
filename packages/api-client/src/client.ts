import type {
  ApiErrorBody,
  BillingSummaryView,
  EncryptionSettingsView,
  LetterFull,
  LetterMeta,
  LockSettingsView,
  MediaLibraryResponse,
  MediaUploadRequest,
  MediaUploadResponse,
  MobileBootstrap,
  NotificationSettingsView,
  UnlockResponse,
} from "@withink/contracts";
import type {
  NotebookSummary,
  SaveEntryPayload,
  SaveEntryResult,
  SyncEntryPayload,
  SyncPushRejection,
} from "@withink/core";

import {
  ApiError,
  SyncRejectedError,
  type ApiClientOptions,
  type SyncDeleteResponse,
  type SyncManifestResponse,
  type SyncNotebookMutationResponse,
  type SyncNotebooksResponse,
  type SyncPullResponse,
  type SyncPushResponse,
  type WithinkApiClient,
} from "./types";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Typed client for the versioned sync HTTP API. This is the shared transport
 * for non-Next clients (Expo) and the seed of the web client after Phase E.
 * It never interprets journal content — ciphertext passes through untouched.
 */
export function createApiClient(options: ApiClientOptions): WithinkApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const credentials = options.credentials ?? "include";

  async function request<T>(
    path: string,
    init: { method?: string; body?: string } = {},
  ): Promise<T> {
    if (!fetchImpl) {
      throw new ApiError(0, "fetch is not available in this runtime");
    }

    const extraHeaders = options.getHeaders ? await options.getHeaders() : {};
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      body: init.body,
      credentials,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...extraHeaders,
      },
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // A non-JSON body is only meaningful for the error path below.
    }

    if (!response.ok) {
      const errorBody = (body ?? {}) as Partial<ApiErrorBody>;
      throw new ApiError(
        response.status,
        errorBody.error ?? response.statusText,
        errorBody.code,
        errorBody.details,
      );
    }

    return body as T;
  }

  async function saveEntries(
    entries: SaveEntryPayload[],
  ): Promise<{ saved: SaveEntryResult[]; rejected: SyncPushRejection[] }> {
    const result = await request<SyncPushResponse>("/api/sync/push", {
      method: "POST",
      body: JSON.stringify({ entries }),
    });
    return { saved: result.saved, rejected: result.rejected };
  }

  return {
    async getBootstrap() {
      return await request<MobileBootstrap>("/api/mobile/bootstrap");
    },

    async unlock(proof: string) {
      return await request<UnlockResponse>("/api/unlock", {
        method: "POST",
        body: JSON.stringify({ proof }),
      });
    },

    async getSyncList() {
      const result = await request<SyncManifestResponse>("/api/sync/manifest");
      return result.entries;
    },

    async getEntries(dates: string[]) {
      if (dates.length === 0) return [];
      const result = await request<SyncPullResponse>("/api/sync/pull", {
        method: "POST",
        body: JSON.stringify({ dates }),
      });
      return result.entries as SyncEntryPayload[];
    },

    saveEntries,

    async saveEntry(payload: SaveEntryPayload) {
      const { saved, rejected } = await saveEntries([payload]);
      const rejection = rejected.find((item) => item.date === payload.date);
      if (rejection) {
        throw new SyncRejectedError(rejection.date, rejection.reason);
      }
      const result = saved.find((item) => item.date === payload.date);
      if (!result) {
        throw new SyncRejectedError(
          payload.date,
          "The server did not acknowledge this entry.",
        );
      }
      return result;
    },

    async deleteEntry(date: string) {
      const result = await request<SyncDeleteResponse>("/api/sync/delete", {
        method: "POST",
        body: JSON.stringify({ date }),
      });
      return result.success;
    },

    async getNotebooks() {
      const result = await request<SyncNotebooksResponse>(
        "/api/sync/notebooks",
      );
      return result.notebooks;
    },

    async createNotebook(name: string): Promise<NotebookSummary> {
      const result = await request<SyncNotebookMutationResponse>(
        "/api/sync/notebooks",
        { method: "POST", body: JSON.stringify({ action: "create", name }) },
      );
      if (!result.notebook) {
        throw new ApiError(
          500,
          "The server did not return the new notebook.",
        );
      }
      return result.notebook;
    },

    async renameNotebook(id: string, name: string) {
      await request<SyncNotebookMutationResponse>("/api/sync/notebooks", {
        method: "POST",
        body: JSON.stringify({ action: "rename", id, name }),
      });
    },

    async deleteNotebook(id: string) {
      await request<SyncNotebookMutationResponse>("/api/sync/notebooks", {
        method: "POST",
        body: JSON.stringify({ action: "delete", id }),
      });
    },

    async setDefaultNotebook(id: string) {
      await request<SyncNotebookMutationResponse>("/api/sync/notebooks", {
        method: "POST",
        body: JSON.stringify({ action: "set-default", id }),
      });
    },

    async moveEntryToNotebook(date: string, notebookId: string) {
      await request<SyncNotebookMutationResponse>("/api/sync/notebooks", {
        method: "POST",
        body: JSON.stringify({ action: "move-entry", date, notebookId }),
      });
    },

    async getLockSettings() {
      return await request<LockSettingsView>("/api/settings/lock");
    },

    async saveLockSettings(input) {
      await request("/api/settings/lock", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async requestPasscodeResetEmail() {
      await request("/api/settings/lock/reset-email", { method: "POST" });
    },

    async getEncryptionSettings() {
      return await request<EncryptionSettingsView>(
        "/api/settings/encryption",
      );
    },

    async mutateEncryption(input) {
      await request("/api/settings/encryption", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async getLetters() {
      return await request<{ letters: LetterMeta[]; today: string }>(
        "/api/letters",
      );
    },

    async getLetter(id: string) {
      return await request<{ letter: LetterFull; today: string }>(
        `/api/letters/${encodeURIComponent(id)}`,
      );
    },

    async saveLetter(input) {
      return await request<LetterFull>("/api/letters", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async sealLetter(id: string) {
      return await request<LetterFull>(
        `/api/letters/${encodeURIComponent(id)}/seal`,
        { method: "POST" },
      );
    },

    async revealLetter(id: string) {
      return await request<LetterFull>(
        `/api/letters/${encodeURIComponent(id)}/reveal`,
        { method: "POST" },
      );
    },

    async deleteLetter(id: string) {
      await request(`/api/letters/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    async getNotificationSettings() {
      return await request<NotificationSettingsView>(
        "/api/notifications/settings",
      );
    },

    async saveNotificationSettings(input) {
      await request("/api/notifications/settings", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async registerPushDevice(input) {
      await request("/api/notifications/devices", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async unregisterPushDevice(token: string) {
      await request("/api/notifications/devices", {
        method: "DELETE",
        body: JSON.stringify({ token }),
      });
    },

    async getMediaLibrary() {
      return await request<MediaLibraryResponse>("/api/media");
    },

    async createMediaUpload(input: MediaUploadRequest) {
      return await request<MediaUploadResponse>("/api/media/upload", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async deleteMedia(key: string) {
      await request(`/api/media/${key}`, { method: "DELETE" });
    },

    async getBillingSummary() {
      return await request<BillingSummaryView>("/api/billing/summary");
    },

    async deleteAccount(password?: string) {
      await request("/api/account/delete", {
        method: "POST",
        body: JSON.stringify(password ? { password } : {}),
      });
    },
  };
}
