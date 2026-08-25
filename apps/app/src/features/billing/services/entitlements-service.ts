import "server-only";

import { getCachedValue, setCachedValue } from "@/lib/redis";

import type { Entitlements, ResolvedPlan } from "../config/plans";
import { ENTITLEMENTS, freeEntitlements } from "../config/plans";
import { BillingAccountRepository } from "../repositories/billing-account-repository";

// Short TTL so plan changes apply quickly without a Mongo read on every
// gate check. Webhook writes invalidate immediately via invalidateCache.
const PLAN_CACHE_TTL_SECONDS = 60;

function getCacheKey(userId: string): string {
  return `billing:${userId}:plan`;
}

/**
 * Resolves a billing record into a concrete tier.
 *
 * Rules:
 * - No record → Free (default tier; no signup row exists).
 * - A paid plan grants access while status is active OR past_due (dunning
 *   grace); canceled/expired records resolve to Free.
 */
export function resolvePlanFromAccount(
  account: {
    plan: string;
    status: string;
  } | null,
): ResolvedPlan {
  if (!account) return "free";
  if (account.status === "canceled") return "free";
  if (account.plan === "plus" || account.plan === "pro") return account.plan;
  return "free";
}

function entitlementsForPlan(plan: ResolvedPlan): Entitlements {
  // Shallow copy per caller: every field is a primitive, so callers can
  // never mutate the shared config through their returned instance.
  return { ...ENTITLEMENTS[plan] };
}

export class EntitlementsService {
  /**
   * Cached tier resolution backing every gate check (backfill window,
   * media quota, session cap). Reads Redis with a short TTL, falls back to
   * Mongo, and degrades to Free on any failure — gates must never block
   * the app or throw upward.
   */
  static async getEntitlements(userId: string): Promise<Entitlements> {
    const cacheKey = getCacheKey(userId);
    const cached = await getCachedValue<ResolvedPlan>(cacheKey);
    if (cached === "free" || cached === "plus" || cached === "pro") {
      return entitlementsForPlan(cached);
    }

    let plan: ResolvedPlan;
    try {
      const account = await BillingAccountRepository.getByUserId(userId);
      plan = resolvePlanFromAccount(account);
    } catch {
      return freeEntitlements();
    }

    await setCachedValue(cacheKey, plan, PLAN_CACHE_TTL_SECONDS);
    return entitlementsForPlan(plan);
  }

  /** Must be called after any write to the user's billing record. */
  static async invalidateCache(userId: string): Promise<void> {
    // Imported lazily so an unconfigured Redis setup never breaks imports.
    const { redis } = await import("@/lib/redis");
    if (!redis) return;
    try {
      await redis.del(getCacheKey(userId));
    } catch {
      // Best-effort; the TTL self-heals any staleness.
    }
  }
}
