import "server-only";

import { Redis } from "@upstash/redis";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

const url = env.UPSTASH_REDIS_REST_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

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
