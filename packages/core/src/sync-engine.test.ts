import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRUNE_GRACE_MS,
  planSyncPull,
  syncListFingerprint,
} from "./sync-engine";

const VERSION = 3;
const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

const base = {
  metadataVersion: VERSION,
  nowMs: NOW,
  pendingDates: [] as string[],
};

describe("syncListFingerprint", () => {
  it("is stable and order-sensitive", () => {
    const list = [
      { date: "2026-11-25", updatedAt: iso(-1000) },
      { date: "2026-11-26", updatedAt: iso(0) },
    ];
    expect(syncListFingerprint(list)).toBe(
      `2026-11-25:${iso(-1000)}|2026-11-26:${iso(0)}`,
    );
    expect(syncListFingerprint([...list].reverse())).not.toBe(
      syncListFingerprint(list),
    );
  });

  it("is empty for an empty list", () => {
    expect(syncListFingerprint([])).toBe("");
  });
});

describe("planSyncPull", () => {
  it("fetches dates missing locally", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [
        { date: "2026-11-25", updatedAt: iso(0) },
        { date: "2026-11-26", updatedAt: iso(0) },
      ],
      localIndex: [],
    });
    expect(plan.fetchDates).toEqual(["2026-11-25", "2026-11-26"]);
    expect(plan.pruneDates).toEqual([]);
  });

  it("fetches dates whose server timestamp differs", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [{ date: "2026-11-26", updatedAt: iso(5000) }],
      localIndex: [{ date: "2026-11-26", updatedAt: iso(0), v: VERSION }],
    });
    expect(plan.fetchDates).toEqual(["2026-11-26"]);
  });

  it("fetches nothing when the timestamps match", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [{ date: "2026-11-26", updatedAt: iso(0) }],
      localIndex: [{ date: "2026-11-26", updatedAt: iso(0), v: VERSION }],
    });
    expect(plan.fetchDates).toEqual([]);
  });

  it("treats an older metadata version as missing", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [{ date: "2026-11-26", updatedAt: iso(0) }],
      localIndex: [{ date: "2026-11-26", updatedAt: iso(0), v: VERSION - 1 }],
    });
    expect(plan.fetchDates).toEqual(["2026-11-26"]);
  });

  it("never fetches or prunes pending local edits", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [
        { date: "2026-11-26", updatedAt: iso(0) },
        { date: "2026-11-27", updatedAt: iso(0) },
      ],
      localIndex: [
        // Pending and absent server-side: would otherwise be prunable.
        {
          date: "2026-11-20",
          updatedAt: iso(-DEFAULT_PRUNE_GRACE_MS * 2),
          v: VERSION,
        },
        // Pending and newer server-side: would otherwise be fetched.
        { date: "2026-11-26", updatedAt: iso(-1000), v: VERSION },
      ],
      pendingDates: ["2026-11-20", "2026-11-26"],
    });
    expect(plan.fetchDates).toEqual(["2026-11-27"]);
    expect(plan.pruneDates).toEqual([]);
  });

  it("prunes deleted-on-server dates past the grace window", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [],
      localIndex: [
        {
          date: "2026-11-20",
          updatedAt: iso(-DEFAULT_PRUNE_GRACE_MS - 1000),
          v: VERSION,
        },
      ],
    });
    expect(plan.pruneDates).toEqual(["2026-11-20"]);
  });

  it("keeps very recent local records inside the grace window", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [],
      localIndex: [
        {
          date: "2026-11-26",
          updatedAt: iso(-DEFAULT_PRUNE_GRACE_MS + 1000),
          v: VERSION,
        },
      ],
    });
    expect(plan.pruneDates).toEqual([]);
  });

  it("does not prune rows with an unparseable timestamp or old version", () => {
    const plan = planSyncPull({
      ...base,
      serverEntries: [],
      localIndex: [
        { date: "2026-11-20", updatedAt: "not-a-date", v: VERSION },
        {
          date: "2026-11-21",
          updatedAt: iso(-DEFAULT_PRUNE_GRACE_MS * 2),
          v: VERSION - 1,
        },
      ],
    });
    expect(plan.pruneDates).toEqual([]);
  });

  it("returns the shared fingerprint and server dates", () => {
    const serverEntries = [
      { date: "2026-11-26", updatedAt: iso(0) },
      { date: "2026-11-25", updatedAt: iso(-1000) },
    ];
    const plan = planSyncPull({ ...base, serverEntries, localIndex: [] });
    expect(plan.fingerprint).toBe(syncListFingerprint(serverEntries));
    expect(plan.serverDates).toEqual(["2026-11-26", "2026-11-25"]);
  });
});
