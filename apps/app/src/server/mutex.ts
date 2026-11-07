import "server-only";

import { randomUUID } from "crypto";

import { redis } from "@/lib/redis";
import { logger } from "@/server/logger";
import { BusinessRuleError } from "@/server/errors";

const DEFAULT_TTL_SECONDS = 10;
const DEFAULT_WAIT_MS = 3_000;
const RETRY_INTERVAL_MS = 50;

/**
 * Serializes a check-then-write critical section per key.
 *
 * Used where a count-then-create pattern enforces a quota (e.g. active
 * letters) and two concurrent requests would both pass the check. Redis
 * `SET NX` is the cross-process lock; when Redis is unavailable we run the
 * callback directly (best effort, matching the rest of the cache layer).
 *
 * The lock is released only when this caller still owns it, so a TTL expiry
 * followed by another acquisition can't delete someone else's lock.
 */
export async function withRedisLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: { ttlSeconds?: number; waitMs?: number } = {},
): Promise<T> {
  if (!redis) return fn();

  const token = randomUUID();
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const deadline = Date.now() + (options.waitMs ?? DEFAULT_WAIT_MS);
  let acquired = false;

  while (Date.now() < deadline) {
    try {
      const result = await redis.set(key, token, { nx: true, ex: ttl });
      if (result === "OK") {
        acquired = true;
        break;
      }
    } catch (error) {
      logger.warn("Redis lock acquisition failed", undefined, error as Error);
      // Cache unavailable: degrade to best-effort rather than blocking writes.
      return fn();
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
  }

  if (!acquired) {
    throw new BusinessRuleError(
      "Another request is already in progress. Please try again.",
    );
  }

  try {
    return await fn();
  } finally {
    try {
      const current = await redis.get<string>(key);
      if (current === token) await redis.del(key);
    } catch (error) {
      logger.warn("Redis lock release failed", undefined, error as Error);
    }
  }
}
