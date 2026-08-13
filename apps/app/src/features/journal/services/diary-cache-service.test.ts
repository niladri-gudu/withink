import { beforeEach, describe, expect, it, vi } from "vitest";

import { diaryCacheService } from "./diary-cache-service";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    getAllEntries: vi.fn(),
    getAllSyncItems: vi.fn(),
    getAllKeys: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getDocument: vi.fn(),
    setDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getSyncItem: vi.fn(),
    setSyncItem: vi.fn(),
    deleteSyncItem: vi.fn(),
    clear: vi.fn(),
  },
}));

const { cryptoMock } = vi.hoisted(() => ({
  cryptoMock: {
    encryptText: vi.fn(),
    decryptText: vi.fn(),
  },
}));

const { actionsMock } = vi.hoisted(() => ({
  actionsMock: {
    getEntrySyncListAction: vi.fn(),
    getEntryAction: vi.fn(),
    saveEntryAction: vi.fn(),
  },
}));

vi.mock("@/lib/diary-cache-db", () => ({
  diaryCacheDB: dbMock,
}));

vi.mock("@/lib/crypto-client", () => cryptoMock);

vi.mock("../actions/entry-actions", () => actionsMock);

const localEntry = {
  date: "2026-01-01",
  title: "Local title",
  snippet: "Local snippet",
  wordCount: 3,
  mood: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function localEntryValue(overrides: Partial<typeof localEntry> = {}) {
  return JSON.stringify({ ...localEntry, ...overrides });
}

const masterKey = {} as CryptoKey;

describe("diaryCacheService.syncDiaryCache", () => {
  beforeEach(() => {
    cryptoMock.encryptText.mockReset();
    cryptoMock.decryptText.mockReset();
    cryptoMock.encryptText.mockImplementation(async (value: string) => value);
    cryptoMock.decryptText.mockImplementation(async (value: string) => value);

    Object.values(dbMock).forEach((fn) => fn.mockReset());
    Object.values(actionsMock).forEach((fn) => fn.mockReset());

    dbMock.getAllEntries.mockResolvedValue([]);
    dbMock.getAllSyncItems.mockResolvedValue([]);
    dbMock.set.mockResolvedValue(undefined);
    dbMock.setDocument.mockResolvedValue(undefined);
  });

  it("does not overwrite a locally-pending entry even when the cloud is newer", async () => {
    dbMock.getAllEntries.mockResolvedValue([
      { key: "2026-01-01", value: localEntryValue() },
    ]);
    dbMock.getAllSyncItems.mockResolvedValue([
      { key: "2026-01-01", value: "pending" },
    ]);
    actionsMock.getEntrySyncListAction.mockResolvedValue({
      success: true,
      data: [{ date: "2026-01-01", updatedAt: "2026-01-01T01:00:00.000Z" }],
    });

    const ok = await diaryCacheService.syncDiaryCache(masterKey, "2026-01-02");

    expect(ok).toBe(true);
    // The pending edit is pushed, never clobbered by a pull.
    expect(actionsMock.getEntryAction).not.toHaveBeenCalled();
  });

  it("does not prune a pending local entry that is missing on the server", async () => {
    dbMock.getAllEntries.mockResolvedValue([
      { key: "2026-01-01", value: localEntryValue() },
    ]);
    dbMock.getAllSyncItems.mockResolvedValue([
      { key: "2026-01-01", value: "pending" },
    ]);
    actionsMock.getEntrySyncListAction.mockResolvedValue({
      success: true,
      data: [],
    });

    await diaryCacheService.syncDiaryCache(masterKey, "2026-01-02");

    expect(dbMock.delete).not.toHaveBeenCalled();
  });

  it("fetches an entry that was updated on the server and not pending locally", async () => {
    actionsMock.getEntrySyncListAction.mockResolvedValue({
      success: true,
      data: [{ date: "2026-01-01", updatedAt: "2026-01-01T01:00:00.000Z" }],
    });
    actionsMock.getEntryAction.mockResolvedValue({
      success: true,
      data: {
        date: "2026-01-01",
        title: "enc:title",
        contentText: "enc:text",
        contentHtml: "enc:html",
        contentJson: "{}",
        mood: null,
        wordCount: 5,
        updatedAt: new Date("2026-01-01T01:00:00.000Z"),
      },
    });

    const ok = await diaryCacheService.syncDiaryCache(masterKey, "2026-01-02");

    expect(ok).toBe(true);
    expect(actionsMock.getEntryAction).toHaveBeenCalledWith(
      "2026-01-01",
      "2026-01-02",
    );
    expect(dbMock.setDocument).toHaveBeenCalledWith(
      "2026-01-01",
      expect.any(String),
    );
    expect(dbMock.set).toHaveBeenCalledWith("2026-01-01", expect.any(String));
  });

  it("prunes a synced local entry that was deleted on the server", async () => {
    dbMock.getAllEntries.mockResolvedValue([
      { key: "2026-01-01", value: localEntryValue() },
    ]);
    actionsMock.getEntrySyncListAction.mockResolvedValue({
      success: true,
      data: [],
    });

    await diaryCacheService.syncDiaryCache(masterKey, "2026-01-02");

    expect(dbMock.delete).toHaveBeenCalledWith("2026-01-01");
  });

  it("does nothing when sync list and local cache are in sync", async () => {
    dbMock.getAllEntries.mockResolvedValue([
      { key: "2026-01-01", value: localEntryValue() },
    ]);
    actionsMock.getEntrySyncListAction.mockResolvedValue({
      success: true,
      data: [{ date: "2026-01-01", updatedAt: localEntry.updatedAt }],
    });

    const ok = await diaryCacheService.syncDiaryCache(masterKey, "2026-01-02");

    expect(ok).toBe(true);
    expect(actionsMock.getEntryAction).not.toHaveBeenCalled();
    expect(dbMock.delete).not.toHaveBeenCalled();
  });
});
