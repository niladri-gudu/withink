import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import { getCachedValue, redis, setCachedValue } from "@/lib/redis";
import { serialize } from "@/lib/utils/serialize";

import {
  ClientEncryptionSettingsModel,
  type IClientEncryptionSettings,
} from "./encryption-settings-model";

const ENCRYPTION_SETTINGS_CACHE_TTL_SECONDS = 3600;

export class EncryptionSettingsRepository {
  private static getCacheKey(userId: string): string {
    return `encryption:${userId}:settings`;
  }

  static async getSettings(
    userId: string,
  ): Promise<IClientEncryptionSettings | null> {
    const cacheKey = this.getCacheKey(userId);

    // 1. Try to fetch from Redis
    const cached = await getCachedValue<IClientEncryptionSettings | null>(
      cacheKey,
    );
    if (cached !== null) {
      return cached;
    }

    // 2. Fallback to MongoDB
    await connectDB();
    const settings = await (
      ClientEncryptionSettingsModel as Model<IClientEncryptionSettings>
    )
      .findOne({ userId })
      .lean();
    const serializedSettings = serialize(settings);

    // 3. Cache the result if found
    if (serializedSettings) {
      await setCachedValue(
        cacheKey,
        serializedSettings,
        ENCRYPTION_SETTINGS_CACHE_TTL_SECONDS,
      );
    }

    return serializedSettings as IClientEncryptionSettings | null;
  }

  static async saveSettings(
    userId: string,
    data: Partial<Omit<IClientEncryptionSettings, "userId">>,
  ): Promise<IClientEncryptionSettings> {
    await connectDB();

    // 1. Update or create settings in DB
    const settings = await (
      ClientEncryptionSettingsModel as Model<IClientEncryptionSettings>
    ).findOneAndUpdate(
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
    await setCachedValue(
      cacheKey,
      serializedSettings,
      ENCRYPTION_SETTINGS_CACHE_TTL_SECONDS,
    );

    return serializedSettings as unknown as IClientEncryptionSettings;
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
