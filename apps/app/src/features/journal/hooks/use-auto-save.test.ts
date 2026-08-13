import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSave } from "./use-auto-save";

const { saveEntryActionMock } = vi.hoisted(() => ({
  saveEntryActionMock: vi.fn(),
}));

const { encryptionState } = vi.hoisted(() => ({
  encryptionState: {
    isClientEncrypted: false,
    masterKey: null as CryptoKey | null,
  },
}));

const { diaryCacheMock } = vi.hoisted(() => ({
  diaryCacheMock: {
    saveLocalDocument: vi.fn().mockResolvedValue(undefined),
    saveLocalMetadata: vi.fn().mockResolvedValue(undefined),
    enqueueOfflineSync: vi.fn().mockResolvedValue(undefined),
    removeOfflineSync: vi.fn().mockResolvedValue(undefined),
    flushOfflineSyncQueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../actions/entry-actions", () => ({
  saveEntryAction: saveEntryActionMock,
}));

vi.mock("@/providers/encryption-provider", () => ({
  useEncryption: () => ({
    isClientEncrypted: encryptionState.isClientEncrypted,
    masterKey: encryptionState.masterKey,
  }),
}));

vi.mock("../services/diary-cache-service", () => ({
  diaryCacheService: diaryCacheMock,
}));

vi.mock("@/lib/crypto-client", () => ({
  encryptText: vi.fn(async (text: string) => `enc:${text}`),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-01-01",
    title: "Hello",
    mood: null as number | null,
    contentHtml: "<p>Hello</p>",
    contentText: "Hello",
    contentJson: { type: "doc", content: [] },
    ...overrides,
  };
}

function renderSaveHook() {
  return renderHook(({ data, enabled }) => useAutoSave(data, 1500, enabled), {
    initialProps: { data: makeData(), enabled: true },
  });
}

const okResult = {
  success: true,
  data: { updatedAt: "2026-01-01T00:00:00.000Z" },
};

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    encryptionState.isClientEncrypted = false;
    encryptionState.masterKey = null;
    saveEntryActionMock.mockReset();
    diaryCacheMock.saveLocalDocument.mockClear();
    diaryCacheMock.saveLocalMetadata.mockClear();
    diaryCacheMock.enqueueOfflineSync.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves after the debounce delay when content changes", async () => {
    saveEntryActionMock.mockResolvedValue(okResult);
    const { result, rerender } = renderSaveHook();

    rerender({ data: makeData({ title: "Hello world" }), enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(saveEntryActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-01-01",
        title: "Hello world",
        mood: null,
      }),
      expect.any(String),
    );
    expect(result.current).toBe("saved");
  });

  it("does not save when nothing changes", async () => {
    saveEntryActionMock.mockResolvedValue(okResult);
    const { rerender } = renderSaveHook();

    rerender({ data: makeData(), enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(saveEntryActionMock).not.toHaveBeenCalled();
  });

  it("does not save when disabled", async () => {
    saveEntryActionMock.mockResolvedValue(okResult);
    const { rerender } = renderHook(
      ({ data, enabled }) => useAutoSave(data, 1500, enabled),
      { initialProps: { data: makeData(), enabled: false } },
    );

    rerender({ data: makeData({ title: "Ignored" }), enabled: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(saveEntryActionMock).not.toHaveBeenCalled();
  });

  it("serializes saves and persists the newest content typed during a save", async () => {
    let resolveFirst!: (value: unknown) => void;
    saveEntryActionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    saveEntryActionMock.mockResolvedValue(okResult);

    const { rerender } = renderSaveHook();

    rerender({ data: makeData({ title: "Draft 1" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(saveEntryActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Draft 1" }),
      expect.any(String),
    );

    // User keeps typing while the first save is still in flight.
    rerender({ data: makeData({ title: "Draft 2" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(saveEntryActionMock).toHaveBeenCalledTimes(1); // still in flight, no parallel save

    // First save resolves -> the follow-up save must persist Draft 2, not drop it.
    await act(async () => {
      resolveFirst(okResult);
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(2);
    expect(saveEntryActionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Draft 2" }),
      expect.any(String),
    );
  });

  it("queues the change locally when the server request times out", async () => {
    encryptionState.isClientEncrypted = true;
    encryptionState.masterKey = {} as CryptoKey;
    saveEntryActionMock.mockImplementationOnce(() => new Promise(() => {}));

    const { result, rerender } = renderSaveHook();

    rerender({ data: makeData({ title: "Offline draft" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500 + 25000);
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(diaryCacheMock.enqueueOfflineSync).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("offline");
  });

  it("shows the locked status when the server reports a locked session", async () => {
    saveEntryActionMock.mockResolvedValue({ success: false, error: "Locked" });
    const { result, rerender } = renderSaveHook();

    rerender({ data: makeData({ title: "Locked draft" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("locked");

    // After the session unlocks, a new edit retries the save successfully.
    saveEntryActionMock.mockResolvedValue(okResult);
    rerender({ data: makeData({ title: "Unlocked draft" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(2);
    expect(saveEntryActionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Unlocked draft" }),
      expect.any(String),
    );
    expect(result.current).toBe("saved");
  });

  it("flushes pending changes on pagehide without waiting for the debounce", async () => {
    saveEntryActionMock.mockResolvedValue(okResult);
    const { rerender } = renderSaveHook();

    rerender({ data: makeData({ title: "Before hide" }), enabled: true });

    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(saveEntryActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Before hide" }),
      expect.any(String),
    );
  });

  it("resets the baseline when the date changes", async () => {
    saveEntryActionMock.mockResolvedValue(okResult);
    const { rerender } = renderSaveHook();

    // Date changes with unchanged content -> no save for stale content.
    rerender({ data: makeData({ date: "2026-01-02" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(saveEntryActionMock).not.toHaveBeenCalled();

    // New content on the new date saves normally.
    rerender({
      data: makeData({ date: "2026-01-02", title: "New day" }),
      enabled: true,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(saveEntryActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-01-02" }),
      expect.any(String),
    );
  });

  it("does not send plaintext when encryption is enabled but master key is missing", async () => {
    encryptionState.isClientEncrypted = true;
    encryptionState.masterKey = null;
    saveEntryActionMock.mockResolvedValue(okResult);

    const { rerender, result } = renderSaveHook();

    // enabled is true, but isClientEncrypted and masterKey is null
    rerender({ data: makeData({ title: "Secret draft" }), enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // Server should NOT be called with plaintext (save should be skipped)
    expect(saveEntryActionMock).not.toHaveBeenCalled();
    expect(result.current).toBe("locked");
  });

  it("does not save when enabled is false due to missing master key", async () => {
    encryptionState.isClientEncrypted = true;
    encryptionState.masterKey = null;
    saveEntryActionMock.mockResolvedValue(okResult);

    const { rerender } = renderHook(
      ({ data, enabled }) => useAutoSave(data, 1500, enabled),
      { initialProps: { data: makeData(), enabled: false } },
    );

    rerender({
      data: makeData({ title: "Draft while locked" }),
      enabled: false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(saveEntryActionMock).not.toHaveBeenCalled();
  });

  it("saves with encryption when master key is present", async () => {
    encryptionState.isClientEncrypted = true;
    encryptionState.masterKey = {} as CryptoKey;
    saveEntryActionMock.mockResolvedValue(okResult);

    const { rerender, result } = renderSaveHook();

    rerender({ data: makeData({ title: "Encrypted draft" }), enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(saveEntryActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-01-01" }),
      expect.any(String),
    );
    expect(result.current).toBe("saved");
  });

  it("resets retry count when user makes new changes during retry backoff", async () => {
    encryptionState.isClientEncrypted = false;
    encryptionState.masterKey = null;
    // First two saves fail with a server error
    saveEntryActionMock
      .mockResolvedValueOnce({ success: false, error: "Server error" })
      .mockResolvedValueOnce({ success: false, error: "Server error" })
      .mockResolvedValue(okResult);

    const { result, rerender } = renderSaveHook();

    rerender({ data: makeData({ title: "Attempt 1" }), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("error");

    // Retry timer fires after RETRY_BASE_MS (5 seconds for first attempt)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(saveEntryActionMock).toHaveBeenCalledTimes(2);
    expect(result.current).toBe("error");

    // User types something new while retry backoff is growing
    saveEntryActionMock.mockClear();
    rerender({ data: makeData({ title: "Attempt 2" }), enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // The new change should trigger a fresh debounce save (not a retry)
    expect(saveEntryActionMock).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("saved");
  });
});
