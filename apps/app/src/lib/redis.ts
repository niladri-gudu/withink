import "server-only";

import { Redis } from "@upstash/redis";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

// Reuse one client per process, mirroring the Mongo/Mongoose singletons in
// @/lib/db. A module-scoped const alone is re-created on Next.js HMR reloads,
// which would leak a client instance per regeneration.
const globalWithRedis = global as typeof globalThis & {
  _redis?: Redis | null;
};

if (!("_redis" in globalWithRedis)) {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  globalWithRedis._redis = url && token ? new Redis({ url, token }) : null;
}

export const redis = globalWithRedis._redis;

// A hanging fetch (unreachable endpoint, dropped packet) never rejects — it
// just stalls every await. Every Redis call races this short timeout and
// degrades to "no cache" so requests can never be held hostage by Redis.
const OP_TIMEOUT_MS = 1_500;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Redis ${label} timed out`)),
      OP_TIMEOUT_MS,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    return await withTimeout(redis.get<T>(key), `get ${key}`);
  } catch (error) {
    logger.error("Redis read failed", error as Error, { key });
    return null;
  }
}

export async function setCachedValue(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;

  try {
    await withTimeout(redis.set(key, value, { ex: ttlSeconds }), `set ${key}`);
  } catch (error) {
    logger.error("Redis write failed", error as Error, { key });
  }
}

export async function incrementCachedValue(
  key: string,
): Promise<number | null> {
  if (!redis) return null;

  try {
    // INCR returns the new value, so callers can skip a follow-up GET.
    return await withTimeout(redis.incr(key), `incr ${key}`);
  } catch (error) {
    logger.error("Redis increment failed", error as Error, { key });
    return null;
  }
}

/**
 * Reads many version-keyed values in a single round trip.
 *
 * Upstash's REST client issues one HTTPS request per command, so a render that
 * needs five cached values was paying five sequential network hops. `MGET`
 * collapses that into one. Results are positional: `result[i]` belongs to
 * `keys[i]` and is `null` on a miss. On failure every entry degrades to `null`
 * so callers fall back to Mongo, exactly like `getCachedValue`.
 */
export async function getCachedValues<T>(
  keys: string[],
): Promise<(T | null)[]> {
  if (!redis || keys.length === 0) return keys.map(() => null);

  try {
    const values = await withTimeout(
      redis.mget<(T | null)[]>(...keys),
      `mget ${keys.length} keys`,
    );
    // Defensive: a short result must not shift later keys out of position.
    return keys.map((_, index) => values[index] ?? null);
  } catch (error) {
    logger.error("Redis batch read failed", error as Error, {
      count: keys.length,
    });
    return keys.map(() => null);
  }
}

/**
 * Writes many cached values in a single round trip via a pipeline. Best-effort
 * like `setCachedValue` — a cache write must never fail a request.
 */
export async function setCachedValues(
  entries: { key: string; value: unknown; ttlSeconds: number }[],
): Promise<void> {
  if (!redis || entries.length === 0) return;

  try {
    const pipeline = redis.pipeline();
    for (const { key, value, ttlSeconds } of entries) {
      pipeline.set(key, value, { ex: ttlSeconds });
    }
    await withTimeout(
      pipeline.exec(),
      `set ${entries.length} keys`,
    );
  } catch (error) {
    logger.error("Redis batch write failed", error as Error, {
      count: entries.length,
    });
  }
}

/** Deletes many keys in one round trip. Best-effort, like `deleteCachedValues`. */
export async function deleteCachedValues(keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;

  try {
    await withTimeout(redis.del(...keys), `del ${keys.length} keys`);
  } catch (error) {
    logger.error("Redis batch delete failed", error as Error, {
      count: keys.length,
    });
  }
}
