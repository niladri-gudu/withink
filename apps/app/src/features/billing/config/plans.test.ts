import { describe, expect, it } from "vitest";

import { ENTITLEMENTS, freeEntitlements, PLAN_PRODUCTS } from "./plans";

describe("plans config", () => {
  it("matches the locked pricing matrix exactly", () => {
    expect(ENTITLEMENTS.free.backfillDays).toBe(14);
    expect(ENTITLEMENTS.free.mediaStorageBytes).toBe(100 * 1024 * 1024);
    expect(ENTITLEMENTS.free.maxConcurrentSessions).toBe(1);
    expect(ENTITLEMENTS.free.notebookLimit).toBe(1);
    expect(ENTITLEMENTS.free.futureLetterLimit).toBe(0);
    expect(ENTITLEMENTS.free.curatedThemes).toBe(false);
    expect(ENTITLEMENTS.free.proAppearance).toBe(false);

    expect(ENTITLEMENTS.plus.backfillDays).toBe(90);
    expect(ENTITLEMENTS.plus.mediaStorageBytes).toBe(10 * 1024 * 1024 * 1024);
    expect(ENTITLEMENTS.plus.maxConcurrentSessions).toBe(3);
    expect(ENTITLEMENTS.plus.notebookLimit).toBe(3);
    expect(ENTITLEMENTS.plus.futureLetterLimit).toBe(3);
    expect(ENTITLEMENTS.plus.curatedThemes).toBe(true);
    expect(ENTITLEMENTS.plus.proAppearance).toBe(false);

    expect(ENTITLEMENTS.pro.backfillDays).toBe(Number.POSITIVE_INFINITY);
    expect(ENTITLEMENTS.pro.mediaStorageBytes).toBe(50 * 1024 * 1024 * 1024);
    expect(ENTITLEMENTS.pro.maxConcurrentSessions).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(ENTITLEMENTS.pro.notebookLimit).toBe(10);
    expect(ENTITLEMENTS.pro.futureLetterLimit).toBe(Number.POSITIVE_INFINITY);
    expect(ENTITLEMENTS.pro.curatedThemes).toBe(true);
    expect(ENTITLEMENTS.pro.proAppearance).toBe(true);
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
    });
    expect(PLAN_PRODUCTS["pro-yearly"]).toEqual({
      plan: "pro",
      interval: "yearly",
    });
    // Subscription products only — the one-time Lifetime product was
    // removed from launch scope (MONETIZATION_PLAN.md §2, deferred).
    expect(Object.keys(PLAN_PRODUCTS)).toHaveLength(4);
  });
});
