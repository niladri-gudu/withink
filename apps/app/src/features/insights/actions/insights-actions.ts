"use server";

import { z } from "zod";

import { getCachedValue, setCachedValue } from "@/lib/redis";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { LockService } from "@/features/lock/services/lock-service";

import {
  InsightsService,
  type InsightsPayload,
} from "../services/insights-service";

// Inputs are validated/clamped BEFORE the Redis key is built: unvalidated
// values would let a crafted caller mint unlimited distinct cache keys (each
// holding the full payload) and force O(N) recomputes on every call.
const insightsArgsSchema = z.object({
  todayStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezoneOffset: z.number().int().min(-900).max(900).catch(0),
});

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

    const parsed = insightsArgsSchema.safeParse({ todayStr, timezoneOffset });
    if (!parsed.success) {
      return { success: false, error: "Invalid request" };
    }
    const validToday = parsed.data.todayStr;
    const validTz = parsed.data.timezoneOffset;

    // The aggregation is an O(N) fetch + full JS pass — keep it from being
    // hammered (which would pin shared Mongo CPU even with the cache above).
    const limit = await rateLimit(`insights:${session.user.id}`, {
      limit: 6,
      windowSeconds: 60,
    });
    if (!limit.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    // The SSR path caches via `use cache`; this action path gets the same
    // short-TTL treatment in Redis so a client-side timezone refetch (which
    // happens once before the TZ cookie is set) never recomputes the full O(N)
    // aggregation on every call. Degrades gracefully when Redis is absent.
    // The key embeds the user's entries version so any entry write invalidates
    // it instantly (matching every other repository cache) instead of serving
    // data that misses the newest entry for up to 5 minutes.
    let version = "0";
    try {
      const v = await getCachedValue<number>(
        `entries:${session.user.id}:version`,
      );
      if (v !== null) version = String(v);
    } catch {
      // Redis absent — fall through uncached.
    }
    const cacheKey = `insights:action:${session.user.id}:v${version}:${validToday}:${validTz}`;
    const cached = await getCachedValue<InsightsPayload>(cacheKey);
    if (cached !== null) {
      return { success: true, data: cached };
    }

    const payload = await InsightsService.getInsights(
      session.user.id,
      validToday,
      validTz,
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
