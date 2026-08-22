"use server";

import { getRequestSession } from "@/lib/request-cache";
import { getCachedValue, setCachedValue } from "@/lib/redis";
import { handleError } from "@/server/errors";
import { LockService } from "@/features/lock/services/lock-service";

import {
  InsightsService,
  type InsightsPayload,
} from "../services/insights-service";

export async function getInsightsAction(
  todayStr: string,
  timezoneOffset = 0,
): Promise<{
  success: boolean;
  data?: InsightsPayload;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    // The SSR path caches via `use cache`; this action path gets the same
    // short-TTL treatment in Redis so a client-side timezone refetch (which
    // happens once before the TZ cookie is set) never recomputes the full O(N)
    // aggregation on every call. Degrades gracefully when Redis is absent.
    const cacheKey = `insights:action:${session.user.id}:${todayStr}:${timezoneOffset}`;
    const cached = await getCachedValue<InsightsPayload>(cacheKey);
    if (cached !== null) {
      return { success: true, data: cached };
    }

    const payload = await InsightsService.getInsights(
      session.user.id,
      todayStr,
      timezoneOffset,
    );

    await setCachedValue(cacheKey, payload, 300);

    return {
      success: true,
      data: payload,
    };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
