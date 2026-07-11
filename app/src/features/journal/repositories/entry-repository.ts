import { EntryModel } from "./entry-model";
import type { IEntry } from "./entry-model";
import { connectDB } from "@/lib/db/mongoose";
import { getCachedValue, setCachedValue, incrementCachedValue } from "@/lib/redis";
import { addDays, getLocalDateString, isDateString } from "@/lib/utils/date";

const HOT_ENTRY_CACHE_TTL_SECONDS = 120; // 2 minutes for today/yesterday
const ARCHIVE_ENTRY_CACHE_TTL_SECONDS = 7200; // 2 hours for older entries
const ENTRY_VERSION_TTL_SECONDS = 2592000; // 30 days for version keys
const LIST_CACHE_TTL_SECONDS = 120; // 2 minutes for listing cache

function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getEntryCacheTtlSeconds(date: string, localToday?: string) {
  const today = isDateString(localToday) ? localToday : getLocalDateString();
  const yesterday = addDays(today, -1);

  if (date === today || date === yesterday) {
    return HOT_ENTRY_CACHE_TTL_SECONDS;
  }

  return ARCHIVE_ENTRY_CACHE_TTL_SECONDS;
}

export class EntryRepository {
  private static async getUserEntryVersion(userId: string): Promise<number> {
    const key = `entries:${userId}:version`;
    const version = await getCachedValue<number>(key);

    if (version !== null) return version;

    // Default to version 1
    await setCachedValue(key, 1, ENTRY_VERSION_TTL_SECONDS);
    return 1;
  }

  static async invalidateUserEntryCache(userId: string): Promise<void> {
    await incrementCachedValue(`entries:${userId}:version`);
  }

  static async getEntry(
    userId: string,
    date: string,
    localToday?: string,
  ): Promise<IEntry | null> {
    const version = await this.getUserEntryVersion(userId);
    const cacheKey = `entries:${userId}:v${version}:entry:${date}`;

    // 1. Try fetching from Redis cache
    const cached = await getCachedValue<IEntry | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 2. Fallback to MongoDB
    await connectDB();
    const entry = await (EntryModel as any).findOne({ userId, date }).lean(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const serializedEntry = serialize(entry);

    // 3. Cache the result
    const ttl = getEntryCacheTtlSeconds(date, localToday);
    await setCachedValue(cacheKey, serializedEntry, ttl);

    return serializedEntry;
  }

  static async saveEntry(
    userId: string,
    date: string,
    data: Partial<Omit<IEntry, "userId" | "date">>,
    localToday?: string,
  ): Promise<IEntry> {
    await connectDB();

    // 1. Save or update in MongoDB
    const entry = await (EntryModel as any).findOneAndUpdate( // eslint-disable-line @typescript-eslint/no-explicit-any
      { userId, date },
      {
        $set: data,
        $setOnInsert: { userId, date },
      },
      { upsert: true, new: true, lean: true },
    );

    const serializedEntry = serialize(entry);

    // 2. Invalidate old cached structures by incrementing the version
    await this.invalidateUserEntryCache(userId);

    // 3. Eagerly write the newly saved entry to hot cache under the new version
    const newVersion = await this.getUserEntryVersion(userId);
    const newCacheKey = `entries:${userId}:v${newVersion}:entry:${date}`;
    const ttl = getEntryCacheTtlSeconds(date, localToday);
    await setCachedValue(newCacheKey, serializedEntry, ttl);

    return serializedEntry;
  }

  static async getEntriesPage(
    userId: string,
    page: number,
    limit: number,
    filters?: {
      search?: string;
      mood?: number | null;
      timeFilter?: "all" | "week" | "month";
      today?: string;
    },
  ): Promise<{ entries: IEntry[]; total: number }> {
    await connectDB();

    const query: any = { userId }; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (filters?.mood) {
      query.mood = filters.mood;
    }

    if (filters?.timeFilter && filters.timeFilter !== "all") {
      const todayStr = filters.today || getLocalDateString();
      if (filters.timeFilter === "week") {
        query.date = { $gte: addDays(todayStr, -7), $lte: todayStr };
      } else if (filters.timeFilter === "month") {
        query.date = { $gte: addDays(todayStr, -30), $lte: todayStr };
      }
    }

    const hasFilters = !!(
      filters?.mood ||
      (filters?.timeFilter && filters.timeFilter !== "all") ||
      filters?.search
    );

    if (filters?.search) {
      const entries = await (EntryModel as any).find(query) // eslint-disable-line @typescript-eslint/no-explicit-any
        .sort({ date: -1 })
        .lean();
      return serialize({ entries, total: entries.length });
    }

    if (!hasFilters) {
      const version = await this.getUserEntryVersion(userId);
      const cacheKey = `entries:${userId}:v${version}:page:${page}:${limit}`;
      const cached = await getCachedValue<{ entries: IEntry[]; total: number }>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const [entries, total] = await Promise.all([
        (EntryModel as any).find(query) // eslint-disable-line @typescript-eslint/no-explicit-any
          .sort({ date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        (EntryModel as any).countDocuments(query), // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);

      const serializedResult = serialize({ entries, total });
      await setCachedValue(cacheKey, serializedResult, LIST_CACHE_TTL_SECONDS);
      return serializedResult;
    } else {
      const [entries, total] = await Promise.all([
        (EntryModel as any).find(query) // eslint-disable-line @typescript-eslint/no-explicit-any
          .sort({ date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        (EntryModel as any).countDocuments(query), // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);
      return serialize({ entries, total });
    }
  }

  static async getEntryStats(
    userId: string,
  ): Promise<{ totalEntries: number; totalWords: number; averageWords: number }> {
    const version = await this.getUserEntryVersion(userId);
    const cacheKey = `entries:${userId}:v${version}:stats`;
    const cached = await getCachedValue<{
      totalEntries: number;
      totalWords: number;
      averageWords: number;
    }>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    await connectDB();
    const statsArray = await (EntryModel as any).aggregate([ // eslint-disable-line @typescript-eslint/no-explicit-any
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          totalWords: { $sum: { $ifNull: ["$wordCount", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalEntries: 1,
          totalWords: 1,
          averageWords: {
            $cond: [
              { $gt: ["$totalEntries", 0] },
              { $round: [{ $divide: ["$totalWords", "$totalEntries"] }, 0] },
              0,
            ],
          },
        },
      },
    ]);

    const stats = statsArray[0] || { totalEntries: 0, totalWords: 0, averageWords: 0 };
    const serializedResult = serialize(stats);
    await setCachedValue(cacheKey, serializedResult, LIST_CACHE_TTL_SECONDS);
    return serializedResult;
  }

  static async getEntryDates(userId: string): Promise<{ date: string }[]> {
    const version = await this.getUserEntryVersion(userId);
    const cacheKey = `entries:${userId}:v${version}:dates`;
    const cached = await getCachedValue<{ date: string }[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    await connectDB();
    const dates = await (EntryModel as any).find({ userId }, { date: 1 }).sort({ date: -1 }).lean(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const serializedResult = serialize(dates);
    await setCachedValue(cacheKey, serializedResult, LIST_CACHE_TTL_SECONDS);
    return serializedResult;
  }

  /**
   * Returns every entry for a user in chronological order.
   * Reads directly from MongoDB (no cache) so exports always reflect the
   * complete, current dataset rather than a partial cached page.
   */
  static async getAllEntries(userId: string): Promise<IEntry[]> {
    await connectDB();
    const entries = await (EntryModel as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .find({ userId })
      .sort({ date: 1 })
      .lean();
    return serialize(entries);
  }

  static async deleteEntry(userId: string, date: string): Promise<boolean> {
    await connectDB();

    const result = await (EntryModel as any).deleteOne({ userId, date }); // eslint-disable-line @typescript-eslint/no-explicit-any
    const deleted = (result.deletedCount || 0) > 0;

    if (deleted) {
      await this.invalidateUserEntryCache(userId);
    }

    return deleted;
  }
}
