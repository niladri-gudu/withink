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
      const errorBody = (body ?? {}) as { error?: string; code?: string };
      throw new ApiError(
        response.status,
        errorBody.error ?? response.statusText,
        errorBody.code,
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
  };
}
