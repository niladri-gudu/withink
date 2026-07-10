import { LockSettingsModel } from "./lock-model";
import type { ILockSettings } from "./lock-model";
import { connectDB } from "@/lib/db/mongoose";
import { getCachedValue, setCachedValue, redis } from "@/lib/redis";

const LOCK_SETTINGS_CACHE_TTL_SECONDS = 3600; // 1 hour

function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export class LockRepository {
  private static getCacheKey(userId: string): string {
    return `lock:${userId}:settings`;
  }

  static async getSettings(userId: string): Promise<ILockSettings | null> {
    const cacheKey = this.getCacheKey(userId);

    // 1. Try to fetch from Redis
    const cached = await getCachedValue<ILockSettings | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 2. Fallback to MongoDB
    await connectDB();
    const settings = await (LockSettingsModel as any).findOne({ userId }).lean();
    const serializedSettings = serialize(settings);

    // 3. Cache the result if found
    if (serializedSettings) {
      await setCachedValue(cacheKey, serializedSettings, LOCK_SETTINGS_CACHE_TTL_SECONDS);
    }

    return serializedSettings as ILockSettings | null;
  }

  static async saveSettings(
    userId: string,
    data: Partial<Omit<ILockSettings, "userId">>,
  ): Promise<ILockSettings> {
    await connectDB();

    // 1. Update or create settings in DB
    const settings = await (LockSettingsModel as any).findOneAndUpdate(
      { userId },
      {
        $set: data,
        $setOnInsert: { userId },
      },
      { upsert: true, new: true, lean: true },
    );

    const serializedSettings = serialize(settings);

    // 2. Invalidate cache in Redis
    await this.invalidateCache(userId);

    // 3. Eagerly write to cache
    const cacheKey = this.getCacheKey(userId);
    await setCachedValue(cacheKey, serializedSettings, LOCK_SETTINGS_CACHE_TTL_SECONDS);

    return serializedSettings as ILockSettings;
  }

  static async invalidateCache(userId: string): Promise<void> {
    if (!redis) return;
    try {
      const cacheKey = this.getCacheKey(userId);
      await redis.del(cacheKey);
    } catch {
      // Gracefully continue if Redis fails
    }
  }
}
