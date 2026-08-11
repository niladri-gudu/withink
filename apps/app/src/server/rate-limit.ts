import "server-only";

import { redis } from "@/lib/redis";
import { logger } from "@/server/logger";

export type RateLimitResult = {
  /** Whether this request is allowed through. */
  success: boolean;
  /** The configured maximum requests per window. */
  limit: number;
  /** Requests remaining in the current window (never negative). */
  remaining: number;
  /** Seconds until the current window resets. */
  resetSeconds: number;
};

type RateLimitOptions = {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Length of the fixed window, in seconds. */
  windowSeconds: number;
};

/**
 * A small fixed-window rate limiter backed by Redis.
 *
 * Rate limiting is a protective control, not a correctness dependency: if Redis
 * is unavailable (not configured, or a transient error) the request is allowed
 * through so legitimate users are never blocked by our own infrastructure. The
 * failure is logged so it remains observable.
 *
 * The window is keyed on `ratelimit:{identifier}`. `identifier` should already
 * be scoped by concern and subject, e.g. `feedback:{userId}`.
 *
 * All three Redis commands (`incr`, `expire`, `ttl`) are sent in a single
 * pipelined round-trip rather than three sequential calls. `expire` is set on
 * every hit — not only on the first — so a crash between `incr` and `expire`
 * can never leave a counter that never expires.
 */
export async function rateLimit(
  identifier: string,
  { limit, windowSeconds }: RateLimitOptions,
): Promise<RateLimitResult> {
  if (!redis) {
    return {
      success: true,
      limit,
      remaining: limit,
      resetSeconds: windowSeconds,
    };
  }

  const key = `ratelimit:${identifier}`;

  try {
    const [count, , ttl] = await redis
      .pipeline()
      .incr(key)
      .expire(key, windowSeconds)
      .ttl(key)
      .exec<[number, number, number]>();

    const resetSeconds = ttl > 0 ? ttl : windowSeconds;
    const remaining = Math.max(0, limit - count);

    return { success: count <= limit, limit, remaining, resetSeconds };
  } catch (error) {
    // Fail open — never block a real user because the limiter itself failed.
    logger.warn(
      "Rate limit check failed; allowing request",
      { identifier },
      error instanceof Error ? error : undefined,
    );
    return {
      success: true,
      limit,
      remaining: limit,
      resetSeconds: windowSeconds,
    };
  }
}
