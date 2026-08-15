import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import { getCachedValue, redis, setCachedValue } from "@/lib/redis";
import { serialize } from "@/lib/utils/serialize";

import {
  ClientEncryptionSettingsModel,
  type IClientEncryptionSettings,
} from "./encryption-settings-model";

// Short TTL so a stale value can never break the Diary Password verification
// for long. Writes go through saveSettings, which invalidates immediately.
const SETTINGS_CACHE_TTL_SECONDS = 60;

export class EncryptionSettingsRepository {
  private static getCacheKey(userId: string): string {
    return `encryption:${userId}:settings`;
  }

  /**
   * Reads the user's client-encryption settings.
   *
   * Cached for a short TTL (60s) and invalidated on every write, so reads on
   * the app-layout critical path (every navigation) hit Redis instead of Mongo.
   * A poisoned value self-heals within the TTL and can never survive a save.
   */
  static async getSettings(
    userId: string,
  ): Promise<IClientEncryptionSettings | null> {
    const cacheKey = this.getCacheKey(userId);
    const cached = await getCachedValue<IClientEncryptionSettings>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    await connectDB();
    const settings = await (
      ClientEncryptionSettingsModel as Model<IClientEncryptionSettings>
    )
      .findOne({ userId })
      .lean();
    const serialized = serialize(settings) as IClientEncryptionSettings | null;

    if (serialized !== null) {
      await setCachedValue(cacheKey, serialized, SETTINGS_CACHE_TTL_SECONDS);
    }

    return serialized;
  }

  static async saveSettings(
    userId: string,
    data: Partial<Omit<IClientEncryptionSettings, "userId">>,
  ): Promise<IClientEncryptionSettings> {
    await connectDB();

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

    // Drop any previously cached value so readers never see stale settings.
    await this.invalidateCache(userId);

    return serialize(settings) as unknown as IClientEncryptionSettings;
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
