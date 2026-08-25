import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENTITLEMENTS } from "../config/plans";
import { BillingAccountRepository } from "../repositories/billing-account-repository";
import {
  EntitlementsService,
  resolvePlanFromAccount,
} from "./entitlements-service";

// Mock Redis (never hit the network in tests)
vi.mock("@/lib/redis", () => ({
  getCachedValue: vi.fn(),
  setCachedValue: vi.fn(),
  redis: {
    del: vi.fn(),
  },
}));

// Mock the Mongo repository
vi.mock("../repositories/billing-account-repository", () => ({
  BillingAccountRepository: {
    getByUserId: vi.fn(),
  },
}));

import { getCachedValue, setCachedValue, redis } from "@/lib/redis";

const mockedGetCachedValue = vi.mocked(getCachedValue);
const mockedSetCachedValue = vi.mocked(setCachedValue);
const mockedGetByUserId = vi.mocked(BillingAccountRepository.getByUserId);
// The mock factory always provides a redis object; assert past the nullable
// production type.
const mockedRedisDel = vi.mocked(redis!.del);

describe("resolvePlanFromAccount", () => {
  it("resolves free when no billing record exists", () => {
    expect(resolvePlanFromAccount(null)).toBe("free");
  });

  it("grants paid access while active or in dunning grace", () => {
    expect(
      resolvePlanFromAccount({ plan: "plus", status: "active" }),
    ).toBe("plus");
    expect(
      resolvePlanFromAccount({
        plan: "pro",
        status: "past_due",
      }),
    ).toBe("pro");
  });

  it("canceled records fall back to free even if plan is still stored", () => {
    expect(
      resolvePlanFromAccount({
        plan: "plus",
        status: "canceled",
      }),
    ).toBe("free");
  });

  it("an explicit free record resolves to free", () => {
    expect(
      resolvePlanFromAccount({ plan: "free", status: "active" }),
    ).toBe("free");
  });
});

describe("EntitlementsService.getEntitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached plan without touching Mongo", async () => {
    mockedGetCachedValue.mockResolvedValue("pro");

    const result = await EntitlementsService.getEntitlements("user-1");

    expect(result).toEqual(ENTITLEMENTS.pro);
    expect(mockedGetByUserId).not.toHaveBeenCalled();
    expect(mockedSetCachedValue).not.toHaveBeenCalled();
  });

  it("resolves through Mongo on cache miss and populates the cache", async () => {
    mockedGetCachedValue.mockResolvedValue(null);
    mockedGetByUserId.mockResolvedValue({
      plan: "plus",
      status: "active",
    } as never);

    const result = await EntitlementsService.getEntitlements("user-2");

    expect(result.plan).toBe("plus");
    expect(result.backfillDays).toBe(90);
    expect(result.mediaStorageBytes).toBe(ENTITLEMENTS.plus.mediaStorageBytes);
    expect(mockedSetCachedValue).toHaveBeenCalledWith(
      "billing:user-2:plan",
      "plus",
      60,
    );
  });

  it("defaults to free entitlements when no billing record exists", async () => {
    mockedGetCachedValue.mockResolvedValue(null);
    mockedGetByUserId.mockResolvedValue(null);

    const result = await EntitlementsService.getEntitlements("user-3");

    expect(result.plan).toBe("free");
    expect(result.backfillDays).toBe(14);
    expect(result.mediaStorageBytes).toBe(100 * 1024 * 1024);
    expect(result.maxConcurrentSessions).toBe(1);
    expect(mockedSetCachedValue).toHaveBeenCalledWith(
      "billing:user-3:plan",
      "free",
      60,
    );
  });

  it("degrades to free without caching when Mongo fails", async () => {
    mockedGetCachedValue.mockResolvedValue(null);
    mockedGetByUserId.mockRejectedValue(new Error("mongo down"));

    const result = await EntitlementsService.getEntitlements("user-4");

    expect(result.plan).toBe("free");
    expect(mockedSetCachedValue).not.toHaveBeenCalled();
  });

  it("ignores unknown cached values and re-resolves", async () => {
    mockedGetCachedValue.mockResolvedValue("gold" as never);
    mockedGetByUserId.mockResolvedValue({
      plan: "pro",
      status: "active",
    } as never);

    const result = await EntitlementsService.getEntitlements("user-5");

    expect(result.plan).toBe("pro");
    expect(mockedGetByUserId).toHaveBeenCalled();
  });

  it("returns copies so callers cannot poison shared config", async () => {
    mockedGetCachedValue.mockResolvedValue(null);
    mockedGetByUserId.mockResolvedValue(null);

    const first = await EntitlementsService.getEntitlements("user-6");
    first.backfillDays = 999999;

    const second = await EntitlementsService.getEntitlements("user-7");
    expect(second.backfillDays).toBe(14);
  });
});

describe("EntitlementsService.invalidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the plan cache key", async () => {
    await EntitlementsService.invalidateCache("user-8");
    expect(mockedRedisDel).toHaveBeenCalledWith("billing:user-8:plan");
  });

  it("swallows Redis failures", async () => {
    mockedRedisDel.mockRejectedValue(new Error("redis down"));
    await expect(
      EntitlementsService.invalidateCache("user-9"),
    ).resolves.toBeUndefined();
  });
});
