import { describe, expect, it } from "vitest";

import {
  ENTITLEMENTS,
  PLAN_PRODUCTS,
  freeEntitlements,
} from "./plans";

describe("plans config", () => {
  it("matches the locked pricing matrix exactly", () => {
    expect(ENTITLEMENTS.free.backfillDays).toBe(14);
    expect(ENTITLEMENTS.free.mediaStorageBytes).toBe(100 * 1024 * 1024);
    expect(ENTITLEMENTS.free.maxConcurrentSessions).toBe(1);
    expect(ENTITLEMENTS.free.notebookLimit).toBe(1);
    expect(ENTITLEMENTS.free.revisionRetentionDays).toBe(7);
    expect(ENTITLEMENTS.free.futureLetterLimit).toBe(0);

    expect(ENTITLEMENTS.plus.backfillDays).toBe(90);
    expect(ENTITLEMENTS.plus.mediaStorageBytes).toBe(10 * 1024 * 1024 * 1024);
    expect(ENTITLEMENTS.plus.maxConcurrentSessions).toBe(3);
    expect(ENTITLEMENTS.plus.notebookLimit).toBe(10);
    expect(ENTITLEMENTS.plus.revisionRetentionDays).toBe(90);
    expect(ENTITLEMENTS.plus.futureLetterLimit).toBe(3);

    expect(ENTITLEMENTS.pro.backfillDays).toBe(Number.POSITIVE_INFINITY);
    expect(ENTITLEMENTS.pro.mediaStorageBytes).toBe(50 * 1024 * 1024 * 1024);
    expect(ENTITLEMENTS.pro.maxConcurrentSessions).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(ENTITLEMENTS.pro.notebookLimit).toBe(Number.POSITIVE_INFINITY);
    expect(ENTITLEMENTS.pro.revisionRetentionDays).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(ENTITLEMENTS.pro.futureLetterLimit).toBe(Number.POSITIVE_INFINITY);
  });

  it("hands out an independent copy of the free tier", () => {
    const entitlements = freeEntitlements();
    entitlements.backfillDays = 0;
    expect(ENTITLEMENTS.free.backfillDays).toBe(14);
  });

  it("maps every product key to its tier", () => {
    expect(PLAN_PRODUCTS["plus-monthly"]).toEqual({
      plan: "plus",
      interval: "monthly",
      lifetime: false,
    });
    expect(PLAN_PRODUCTS["pro-lifetime"]).toEqual({
      plan: "pro",
      interval: null,
      lifetime: true,
    });
    expect(Object.keys(PLAN_PRODUCTS)).toHaveLength(5);
  });
});
