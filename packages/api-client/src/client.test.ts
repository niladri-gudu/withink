import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { ApiError, SyncRejectedError } from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response> | Response,
) {
  return vi.fn<typeof fetch>(async (input, init) =>
    handler(String(input), init),
  );
}

const entry = {
  date: "2026-11-26",
  title: "cipher",
  contentHtml: "cipher",
  contentText: "cipher",
  contentJson: "cipher",
  wordCount: 3,
  mood: 4,
  notebookId: "0123456789abcdef01234567",
  createdAt: "2026-11-26T09:00:00.000Z",
  updatedAt: "2026-11-26T10:00:00.000Z",
};

describe("createApiClient", () => {
  it("normalizes the base URL and sends cookie credentials", async () => {
    const fetchImpl = makeFetch(() =>
      jsonResponse({
        entries: [{ date: "2026-11-26", updatedAt: entry.updatedAt }],
      }),
    );
    const client = createApiClient({
      baseUrl: "https://app.test/",
      fetch: fetchImpl,
    });

    await expect(client.getSyncList()).resolves.toEqual([
      { date: "2026-11-26", updatedAt: entry.updatedAt },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://app.test/api/sync/manifest",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
  });

  it("injects auth headers for native-style callers", async () => {
    const fetchImpl = makeFetch(() => jsonResponse({ entries: [] }));
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
      credentials: "omit",
      getHeaders: async () => ({ Authorization: "Bearer session-token" }),
    });

    await client.getSyncList();

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer session-token",
    });
  });

  it("does not fetch when there is nothing to pull", async () => {
    const fetchImpl = makeFetch(() => jsonResponse({ entries: [] }));
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    await expect(client.getEntries([])).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts a bounded pull and returns opaque entries", async () => {
    const fetchImpl = makeFetch(() => jsonResponse({ entries: [entry] }));
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    await expect(client.getEntries(["2026-11-26"])).resolves.toEqual([entry]);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://app.test/api/sync/pull");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ dates: ["2026-11-26"] });
  });

  it("returns saved and rejected batches", async () => {
    const fetchImpl = makeFetch(() =>
      jsonResponse({
        saved: [
          {
            date: "2026-11-26",
            updatedAt: entry.updatedAt,
            notebookId: null,
          },
        ],
        rejected: [{ date: "2026-11-25", reason: "Out of window" }],
      }),
    );
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    const result = await client.saveEntries([
      { ...entry, today: "2026-11-26" },
    ]);
    expect(result.saved).toHaveLength(1);
    expect(result.rejected).toEqual([
      { date: "2026-11-25", reason: "Out of window" },
    ]);
  });

  it("throws SyncRejectedError when a single save is rejected", async () => {
    const fetchImpl = makeFetch(() =>
      jsonResponse({
        saved: [],
        rejected: [{ date: "2026-11-26", reason: "Stale" }],
      }),
    );
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    await expect(
      client.saveEntry({ ...entry, today: "2026-11-26" }),
    ).rejects.toBeInstanceOf(SyncRejectedError);
  });

  it("surfaces the shared error code and details", async () => {
    const fetchImpl = makeFetch(() =>
      jsonResponse(
        { error: "Locked", code: "LOCKED", details: { retryAfter: 30 } },
        403,
      ),
    );
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    const error = await client.getSyncList().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      code: "LOCKED",
      details: { retryAfter: 30 },
    });
  });

  it("falls back to the status text for a non-JSON error body", async () => {
    const fetchImpl = makeFetch(
      () =>
        new Response("oops", {
          status: 500,
          statusText: "Server Error",
        }),
    );
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    await expect(client.getSyncList()).rejects.toMatchObject({
      status: 500,
      message: "Server Error",
    });
  });

  it("fetches the mobile bootstrap", async () => {
    const bootstrap = {
      user: { id: "user-1", name: "Tester", email: "tester@example.com" },
      encryption: {
        isClientEncrypted: true,
        encryptionSalt: "a".repeat(32),
        verificationCiphertext: "iv:tag:cipher",
        kdfIterations: 600_000,
      },
      lock: { isLockEnabled: true, autoLockTimeout: 300, hasPasscode: true },
    };
    const fetchImpl = makeFetch(() => jsonResponse(bootstrap));
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    await expect(client.getBootstrap()).resolves.toEqual(bootstrap);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://app.test/api/mobile/bootstrap",
    );
  });

  it("exchanges an unlock proof for a token", async () => {
    const fetchImpl = makeFetch(() =>
      jsonResponse({
        token: "unlock-token",
        expiresAt: "2026-11-26T10:00:00.000Z",
      }),
    );
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    const proof = "a".repeat(64);
    await expect(client.unlock(proof)).resolves.toMatchObject({
      token: "unlock-token",
    });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://app.test/api/unlock");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ proof });
  });

  it("covers notebook mutations", async () => {
    const notebook = {
      id: "0123456789abcdef01234567",
      name: "Ideas",
      isDefault: false,
      entryCount: 0,
      lastWrittenAt: null,
    };
    const fetchImpl = makeFetch((_url, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        if (body.action === "create") {
          return jsonResponse({ success: true, notebook });
        }
        return jsonResponse({ success: true });
      }
      return jsonResponse({ notebooks: [notebook] });
    });
    const client = createApiClient({
      baseUrl: "https://app.test",
      fetch: fetchImpl,
    });

    await expect(client.createNotebook("Ideas")).resolves.toEqual(notebook);
    await client.renameNotebook(notebook.id, "Renamed");
    await client.deleteNotebook(notebook.id);
    await client.setDefaultNotebook(notebook.id);
    await client.moveEntryToNotebook("2026-11-26", notebook.id);

    const bodies = fetchImpl.mock.calls
      .map(([, init]) => init?.body)
      .filter(Boolean)
      .map((body) => JSON.parse(String(body)));
    expect(bodies.map((body) => body.action)).toEqual([
      "create",
      "rename",
      "delete",
      "set-default",
      "move-entry",
    ]);
  });
});
