import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import { redis } from "@/lib/redis";
import { serialize } from "@/lib/utils/serialize";

import {
  ClientEncryptionSettingsModel,
  type IClientEncryptionSettings,
} from "./encryption-settings-model";

export class EncryptionSettingsRepository {
  private static getCacheKey(userId: string): string {
    return `encryption:${userId}:settings`;
  }

  /**
   * Reads the user's client-encryption settings straight from MongoDB.
   *
   * Deliberately NOT cached: a stale verificationCiphertext would make the
   * Diary Password verification fail, and local dev + the dev deployment
   * share the same Redis, so a poisoned value breaks both. This is a single
   * indexed document lookup, so caching adds risk for negligible gain.
   */
  static async getSettings(
    userId: string,
  ): Promise<IClientEncryptionSettings | null> {
    await connectDB();
    const settings = await (
      ClientEncryptionSettingsModel as Model<IClientEncryptionSettings>
    )
      .findOne({ userId })
      .lean();
    return serialize(settings) as IClientEncryptionSettings | null;
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
