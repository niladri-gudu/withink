import "server-only";

import { Redis } from "@upstash/redis";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

const url = env.UPSTASH_REDIS_REST_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export async function getCachedValue<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
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
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    logger.error("Redis write failed", error as Error, { key });
  }
}

export async function incrementCachedValue(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.incr(key);
  } catch (error) {
    logger.error("Redis increment failed", error as Error, { key });
  }
}
