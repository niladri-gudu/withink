import type {
  SaveEntryPayload,
  SyncEntryPayload,
} from "@withink/core";
import { describe, expect, it } from "vitest";

import { createDiaryCache, type DiaryApi } from "./diary-cache-core";
import { createMemoryLocalStore } from "./memory-store";

const KEY = new Uint8Array([1, 2, 3, 4]);
const SERVER_UPDATED_AT = "2026-11-26T12:00:00.000Z";

/** Reversible string "cipher" so the tests assert record structure, not AES. */
const crypto = {
  async encryptText(text: string) {
    return `enc:${text}`;
  },
  async decryptText(ciphertext: string) {
    if (!ciphertext.startsWith("enc:")) throw new Error("bad ciphertext");
    return ciphertext.slice(4);
  },
};

function createFakeApi(records: Record<string, SyncEntryPayload> = {}) {
  const saved: SaveEntryPayload[] = [];
  const deleted: string[] = [];
  let failSave = false;

  const api: DiaryApi & {
    saved: SaveEntryPayload[];
    deleted: string[];
    setFailSave(value: boolean): void;
  } = {
    saved,
    deleted,
    setFailSave(value) {
      failSave = value;
    },
    async getSyncList() {
      return Object.values(records).map((entry) => ({
        date: entry.date,
        updatedAt: entry.updatedAt,
      }));
    },
    async getEntries(dates) {
      return dates
        .map((date) => records[date])
        .filter((entry): entry is SyncEntryPayload => Boolean(entry));
    },
    async saveEntry(payload) {
      if (failSave) throw new Error("network is down");
      saved.push(payload);
      return {
        date: payload.date,
        updatedAt: SERVER_UPDATED_AT,
        notebookId: null,
      };
    },
    async deleteEntry(date) {
      deleted.push(date);
      return true;
    },
  };

  return api;
}

function remoteEntry(
  date: string,
  title: string,
  text: string,
  updatedAt = "2026-11-20T08:00:00.000Z",
): SyncEntryPayload {
  return {
    date,
    title: `enc:${title}`,
    contentHtml: `enc:<p>${text}</p>`,
    contentText: `enc:${text}`,
    contentJson: `enc:${JSON.stringify({ type: "doc" })}`,
    wordCount: 4,
    mood: null,
    notebookId: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt,
  };
}

function setup(records: Record<string, SyncEntryPayload> = {}) {
  const store = createMemoryLocalStore();
  const api = createFakeApi(records);
  const cache = createDiaryCache({
    store,
    api,
    crypto,
    now: () => Date.parse(SERVER_UPDATED_AT),
    localToday: () => "2026-11-26",
  });
  return { store, api, cache, records };
}

const INPUT = {
  date: "2026-11-26",
  title: "Hello",
  contentText: "First line\n\nSecond",
  contentHtml: "<p>First line</p><p>Second</p>",
  contentJson: { type: "doc" },
  mood: null,
};

describe("mobile diary cache", () => {
  it("writes document, metadata, sync index and queue locally", async () => {
    const { cache, store } = setup();

    const metadata = await cache.saveEntryLocally(INPUT, KEY);

    expect(metadata.wordCount).toBe(3);
    expect(metadata.snippet).toBe("First line Second");
    expect(metadata.v).toBe(3);
    expect(metadata.searchText).toContain("hello");

    const document = await cache.getLocalEntry(INPUT.date, KEY);
    expect(document?.contentText).toBe(INPUT.contentText);
    expect(document?.contentHtml).toBe(INPUT.contentHtml);

    const timeline = await cache.getLocalTimeline(KEY);
    expect(timeline.map((entry) => entry.title)).toEqual(["Hello"]);

    expect(await cache.pendingCount()).toBe(1);
    const index = await store.getSyncIndex();
    expect(index).toHaveLength(1);
    expect(index[0]?.date).toBe(INPUT.date);
    expect(index[0]?.v).toBe(3);
  });

  it("flushes the queue with server-encrypted fields and stamps the server time", async () => {
    const { cache, api, store } = setup();
    await cache.saveEntryLocally(INPUT, KEY);

    const result = await cache.flushQueue(KEY);

    expect(result).toEqual({ pushed: 1, failed: 0, lastError: null });
    expect(api.saved).toHaveLength(1);
    expect(api.saved[0]).toMatchObject({
      date: INPUT.date,
      title: "enc:Hello",
      contentHtml: "enc:<p>First line</p><p>Second</p>",
      contentText: "enc:First line\n\nSecond",
      contentJson: 'enc:{"type":"doc"}',
      wordCount: 3,
      mood: null,
      today: "2026-11-26",
    });

    expect(await cache.pendingCount()).toBe(0);
    expect((await cache.getLocalMetadata(INPUT.date, KEY))?.updatedAt).toBe(
      SERVER_UPDATED_AT,
    );
    expect((await store.getSyncIndex())[0]?.updatedAt).toBe(SERVER_UPDATED_AT);
  });

  it("keeps queued edits when the push fails", async () => {
    const { cache, api } = setup();
    await cache.saveEntryLocally(INPUT, KEY);
    api.setFailSave(true);

    const result = await cache.flushQueue(KEY);

    expect(result.pushed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.lastError).toBe("network is down");
    expect(await cache.pendingCount()).toBe(1);
    // The local copy stays usable while offline.
    expect((await cache.getLocalEntry(INPUT.date, KEY))?.title).toBe("Hello");
  });

  it("pulls remote entries and decrypts them into SQLite records", async () => {
    const { cache } = setup({
      "2026-11-20": remoteEntry("2026-11-20", "Remote", "From another device"),
    });

    const result = await cache.sync(KEY);

    expect(result).toMatchObject({ pushed: 0, failed: 0, fetched: 1 });
    const document = await cache.getLocalEntry("2026-11-20", KEY);
    expect(document).toMatchObject({
      title: "Remote",
      contentText: "From another device",
      contentHtml: "<p>From another device</p>",
    });
    expect((await cache.getLocalTimeline(KEY))[0]?.title).toBe("Remote");
  });

  it("never overwrites a date with a pending local edit", async () => {
    const { cache, records } = setup();
    await cache.saveEntryLocally(INPUT, KEY);
    records[INPUT.date] = remoteEntry(
      INPUT.date,
      "Remote wins?",
      "server copy",
      "2026-11-27T09:00:00.000Z",
    );

    await cache.pullFromServer(KEY);

    expect((await cache.getLocalEntry(INPUT.date, KEY))?.title).toBe("Hello");
    expect(await cache.pendingCount()).toBe(1);
  });

  it("prunes local entries the server no longer has, outside the grace window", async () => {
    const { cache, store } = setup();
    await store.putSyncIndex({
      date: "2020-01-01",
      updatedAt: "2020-01-01T00:00:00.000Z",
      v: 3,
    });
    await store.putMetadata("2020-01-01", "enc:{}");

    const result = await cache.pullFromServer(KEY);

    expect(result.pruned).toBe(1);
    expect(await cache.getLocalMetadata("2020-01-01", KEY)).toBeNull();
    expect(await store.getSyncIndex()).toEqual([]);
  });

  it("fetches a single entry when the editor opens an unseen date", async () => {
    const { cache } = setup({
      "2026-11-21": remoteEntry("2026-11-21", "Fetched", "On open"),
    });

    const document = await cache.fetchEntryIfMissing("2026-11-21", KEY);
    expect(document?.title).toBe("Fetched");

    const missing = await cache.fetchEntryIfMissing("2026-11-19", KEY);
    expect(missing).toBeNull();
  });

  it("deletes on the server before purging every local copy", async () => {
    const { cache, api } = setup();
    await cache.saveEntryLocally(INPUT, KEY);

    await cache.deleteEntry(INPUT.date);

    expect(api.deleted).toEqual([INPUT.date]);
    expect(await cache.getLocalEntry(INPUT.date, KEY)).toBeNull();
    expect(await cache.getLocalMetadata(INPUT.date, KEY)).toBeNull();
    expect(await cache.pendingCount()).toBe(0);
  });
});
