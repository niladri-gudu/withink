import { beforeEach, describe, expect, it, vi } from "vitest";

import { JournalSyncService } from "./journal-sync-service";

const { flushMock, syncMock } = vi.hoisted(() => ({
  flushMock: vi.fn(),
  syncMock: vi.fn(),
}));

const { getAllSyncItemsMock } = vi.hoisted(() => ({
  getAllSyncItemsMock: vi.fn(),
}));

vi.mock("@/lib/diary-cache-db", () => ({
  diaryCacheDB: {
    getAllSyncItems: getAllSyncItemsMock,
  },
}));

vi.mock("./diary-cache-service", () => ({
  diaryCacheService: {
    flushOfflineSyncQueue: flushMock,
    syncDiaryCache: syncMock,
  },
}));

const masterKey = {} as CryptoKey;

describe("JournalSyncService", () => {
  beforeEach(() => {
    flushMock.mockReset().mockResolvedValue({ succeeded: [], failed: [] });
    syncMock.mockReset().mockResolvedValue(true);
    getAllSyncItemsMock.mockReset().mockResolvedValue([]);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("reports synced for unknown dates", () => {
    const service = new JournalSyncService();
    expect(service.getStatus("2026-01-01")).toBe("synced");
  });

  it("marks a date pending and notifies listeners", () => {
    const service = new JournalSyncService();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    service.markPending("2026-01-01");

    expect(service.getStatus("2026-01-01")).toBe("pending");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("flushes the pending queue then pulls during a full sync", async () => {
    flushMock.mockResolvedValue({ succeeded: ["2026-01-01"], failed: [] });

    const service = new JournalSyncService();
    await service.requestSync(masterKey);

    expect(flushMock).toHaveBeenCalledTimes(1);
    expect(syncMock).toHaveBeenCalledTimes(1);
    // After a successful push the queue is empty -> synced again.
    expect(service.getStatus("2026-01-01")).toBe("synced");
  });

  it("runs push-only on requestPush", async () => {
    const service = new JournalSyncService();
    await service.requestPush(masterKey);

    expect(flushMock).toHaveBeenCalledTimes(1);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("skips the network when offline without leaving queued work", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    const service = new JournalSyncService();
    await service.requestSync(masterKey);

    expect(flushMock).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
    // The run terminates — a later online sync still works.
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    await service.requestSync(masterKey);
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it("tracks dates still queued as pending after a sync cycle", async () => {
    getAllSyncItemsMock.mockResolvedValue([{ key: "2026-01-02", value: "x" }]);

    const service = new JournalSyncService();
    await service.requestSync(masterKey);

    expect(service.getStatus("2026-01-02")).toBe("pending");
    expect(service.getStatus("2026-01-01")).toBe("synced");
  });

  it("coalesces concurrent sync requests into a single in-flight run", async () => {
    const resolvers: Array<
      (value: { succeeded: string[]; failed: string[] }) => void
    > = [];
    flushMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const service = new JournalSyncService();
    const first = service.requestSync(masterKey);
    const second = service.requestSync(masterKey);

    // Only one run is in flight despite two requests (no parallel push).
    await vi.waitFor(() => {
      expect(flushMock).toHaveBeenCalledTimes(1);
    });
    await Promise.resolve();
    expect(flushMock).toHaveBeenCalledTimes(1);

    // Resolve the first push; the queued second request starts a follow-up run.
    resolvers[0]?.({ succeeded: [], failed: [] });
    await vi.waitFor(() => {
      expect(flushMock).toHaveBeenCalledTimes(2);
    });
    resolvers[1]?.({ succeeded: [], failed: [] });

    await Promise.all([first, second]);
    // Only the first run pulled; the follow-up was push-only.
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it("resets pending dates once the queue is cleared by a sync", async () => {
    const service = new JournalSyncService();
    service.markPending("2026-01-01");
    expect(service.getStatus("2026-01-01")).toBe("pending");

    await service.requestPush(masterKey);

    expect(service.getStatus("2026-01-01")).toBe("synced");
  });
});
