import { describe, expect, it, vi } from "vitest";

import { createMemoryLocalStore } from "./memory-store";
import { createSqliteLocalStore, type SqlDriver } from "./sqlite-store";

/**
 * Minimal SQL engine for one `local_kv` table. It understands exactly the
 * statements the adapter issues, so a regression in SQL or parameter order
 * fails the test rather than passing silently.
 */
function createFakeDriver(): SqlDriver {
  const rows = new Map<string, Map<string, string>>();

  function bucket(store: string): Map<string, string> {
    let value = rows.get(store);
    if (!value) {
      value = new Map();
      rows.set(store, value);
    }
    return value;
  }

  return {
    async exec(sql) {
      if (sql.includes("CREATE TABLE")) return;
      if (sql === "DELETE FROM local_kv") {
        rows.clear();
        return;
      }
      throw new Error(`unexpected exec: ${sql}`);
    },
    async run(sql, params = []) {
      if (sql.startsWith("INSERT OR REPLACE")) {
        const [store, key, value] = params as string[];
        bucket(store!).set(key!, value!);
        return;
      }
      if (sql === "DELETE FROM local_kv WHERE store = ? AND key = ?") {
        bucket(params[0] as string).delete(params[1] as string);
        return;
      }
      if (sql === "DELETE FROM local_kv WHERE store = ?") {
        rows.delete(params[0] as string);
        return;
      }
      throw new Error(`unexpected run: ${sql}`);
    },
    async getAll<T>(sql: string, params: unknown[] = []) {
      if (sql !== "SELECT key, value FROM local_kv WHERE store = ?") {
        throw new Error(`unexpected getAll: ${sql}`);
      }
      return [...bucket(params[0] as string)].map(([key, value]) => ({
        key,
        value,
      })) as T[];
    },
    async getFirst<T>(sql: string, params: unknown[] = []) {
      if (sql !== "SELECT value FROM local_kv WHERE store = ? AND key = ?") {
        throw new Error(`unexpected getFirst: ${sql}`);
      }
      const value = bucket(params[0] as string).get(params[1] as string);
      return (value === undefined ? null : { value }) as T | null;
    },
  };
}

const PROFILE = {
  id: "local",
  accountId: "user-1",
  createdAt: "2026-11-26T00:00:00.000Z",
  updatedAt: "2026-11-26T00:00:00.000Z",
  encryption: {
    isClientEncrypted: true,
    encryptionSalt: "00",
    verificationCiphertext: "iv:cipher",
    kdfIterations: 600_000,
  },
  lock: {
    isLockEnabled: true,
    hasPasscode: true,
    autoLockTimeout: 15,
    lockOnTabHide: true,
  },
  user: { id: "user-1", name: "Test", email: "test@example.com" },
  lastKnownPlan: "free" as const,
  planCheckedAt: null,
};

describe("SQLite LocalStore", () => {
  it("round-trips encrypted metadata", async () => {
    const store = createSqliteLocalStore(createFakeDriver());

    expect(await store.getMetadata("2026-11-26")).toBeNull();
    await store.putMetadata("2026-11-26", "iv:ciphertext");

    expect(await store.getMetadata("2026-11-26")).toBe("iv:ciphertext");
    expect(await store.getAllMetadata()).toEqual([
      { key: "2026-11-26", value: "iv:ciphertext" },
    ]);

    await store.deleteMetadata("2026-11-26");
    expect(await store.getMetadata("2026-11-26")).toBeNull();
  });

  it("keeps documents separate from metadata", async () => {
    const store = createSqliteLocalStore(createFakeDriver());

    await store.putDocument("2026-11-26", "doc");
    await store.putMetadata("2026-11-26", "meta");

    expect(await store.getDocument("2026-11-26")).toBe("doc");
    expect(await store.getMetadata("2026-11-26")).toBe("meta");

    await store.deleteDocument("2026-11-26");
    expect(await store.getDocument("2026-11-26")).toBeNull();
    expect(await store.getMetadata("2026-11-26")).toBe("meta");
  });

  it("lists and deletes queued sync items", async () => {
    const store = createSqliteLocalStore(createFakeDriver());

    await store.putSyncItem("2026-11-25", "a");
    await store.putSyncItem("2026-11-26", "b");

    expect(
      (await store.getAllSyncItems()).map((item) => item.key).sort(),
    ).toEqual(["2026-11-25", "2026-11-26"]);

    await store.deleteSyncItem("2026-11-25");
    expect(await store.getSyncItem("2026-11-25")).toBeNull();
    expect(await store.getAllSyncItems()).toHaveLength(1);
  });

  it("stores the plaintext sync index as JSON", async () => {
    const store = createSqliteLocalStore(createFakeDriver());

    await store.putSyncIndex({
      date: "2026-11-26",
      updatedAt: "2026-11-26T10:00:00.000Z",
      v: 3,
    });

    expect(await store.getSyncIndex()).toEqual([
      { date: "2026-11-26", updatedAt: "2026-11-26T10:00:00.000Z", v: 3 },
    ]);

    await store.deleteSyncIndex("2026-11-26");
    expect(await store.getSyncIndex()).toEqual([]);
  });

  it("round-trips the local profile and notebooks", async () => {
    const store = createSqliteLocalStore(createFakeDriver());

    expect(await store.getProfile()).toBeNull();
    expect(await store.getNotebooks()).toEqual([]);

    await store.putProfile(PROFILE);
    await store.putNotebooks([
      {
        id: "n1",
        name: "Journal",
        isDefault: true,
        entryCount: 2,
        lastWrittenAt: null,
      },
    ]);

    expect((await store.getProfile())?.accountId).toBe("user-1");
    expect(await store.getNotebooks()).toEqual([
      {
        id: "n1",
        name: "Journal",
        isDefault: true,
        entryCount: 2,
        lastWrittenAt: null,
      },
    ]);
  });

  it("clearEntries keeps the profile and clear removes everything", async () => {
    const store = createSqliteLocalStore(createFakeDriver());

    await store.putMetadata("2026-11-26", "meta");
    await store.putSyncIndex({ date: "2026-11-26", updatedAt: "x", v: 3 });
    await store.putProfile(PROFILE);

    await store.clearEntries();
    expect(await store.getMetadata("2026-11-26")).toBeNull();
    expect(await store.getSyncIndex()).toEqual([]);
    expect(await store.getProfile()).not.toBeNull();

    await store.clear();
    expect(await store.getProfile()).toBeNull();
  });

  it("rejects on write failures so durability is never silently lost", async () => {
    const driver = createFakeDriver();
    const store = createSqliteLocalStore(driver);
    await store.getMetadata("warm");

    vi.spyOn(driver, "run").mockRejectedValueOnce(new Error("disk full"));

    await expect(store.putDocument("2026-11-26", "doc")).rejects.toThrow(
      "disk full",
    );
  });

  it("degrades reads to empty values when the driver fails", async () => {
    const driver = createFakeDriver();
    const store = createSqliteLocalStore(driver);
    await store.putMetadata("2026-11-26", "meta");

    vi.spyOn(driver, "getFirst").mockRejectedValueOnce(new Error("closed"));

    expect(await store.getMetadata("2026-11-26")).toBeNull();
  });
});

describe("memory LocalStore fallback", () => {
  it("implements the same contract", async () => {
    const store = createMemoryLocalStore();

    await store.putMetadata("2026-11-26", "meta");
    await store.putSyncItem("2026-11-26", "queued");
    await store.putSyncIndex({ date: "2026-11-26", updatedAt: "x", v: 3 });
    await store.putNotebooks([
      {
        id: "n1",
        name: "Journal",
        isDefault: true,
        entryCount: 0,
        lastWrittenAt: null,
      },
    ]);

    expect(await store.getMetadata("2026-11-26")).toBe("meta");
    expect(await store.getAllSyncItems()).toHaveLength(1);
    expect(await store.getSyncIndex()).toHaveLength(1);
    expect(await store.getNotebooks()).toHaveLength(1);

    await store.clearEntries();
    expect(await store.getMetadata("2026-11-26")).toBeNull();
    expect(await store.getSyncIndex()).toEqual([]);
    expect(await store.getNotebooks()).toEqual([]);
  });
});
