/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { Entry } from "@/models/entry";
import { connectDB } from "@/lib/mongoose";
import { addDays, getLocalDateString, isDateString } from "@/lib/utils/date";
import {
  getCachedValue,
  incrementCachedValue,
  setCachedValue,
} from "@/lib/redis";

const HOT_ENTRY_CACHE_TTL_SECONDS = 120;
const ARCHIVE_ENTRY_CACHE_TTL_SECONDS = 60 * 60 * 2;
const LIST_CACHE_TTL_SECONDS = 120;
const ENTRY_VERSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type CachedEntry = Record<string, any>;

export interface EntryStats {
  totalEntries: number;
  totalWords: number;
  averageWords: number;
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function getUserEntryVersion(userId: string) {
  const key = `entries:${userId}:version`;
  const version = await getCachedValue<number>(key);

  if (version !== null) return version;

  await setCachedValue(key, 1, ENTRY_VERSION_TTL_SECONDS);
  return 1;
}

async function getOrSetUserEntryCache<T>(
  userId: string,
  suffix: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const version = await getUserEntryVersion(userId);
  const key = `entries:${userId}:v${version}:${suffix}`;
  const cached = await getCachedValue<T>(key);

  if (cached !== null) return cached;

  const value = serialize(await loader());
  await setCachedValue(key, value, ttlSeconds);
  return value;
}

function getEntryCacheTtlSeconds(date: string, localToday?: string) {
  const today = isDateString(localToday) ? localToday : getLocalDateString();
  const yesterday = addDays(today, -1);

  if (date === today || date === yesterday) {
    return HOT_ENTRY_CACHE_TTL_SECONDS;
  }

  return ARCHIVE_ENTRY_CACHE_TTL_SECONDS;
}

export async function invalidateUserEntryCache(userId: string) {
  await incrementCachedValue(`entries:${userId}:version`);
}

export async function setCachedEntry(
  userId: string,
  date: string,
  entry: CachedEntry | null,
  localToday?: string,
) {
  const version = await getUserEntryVersion(userId);
  const key = `entries:${userId}:v${version}:entry:${date}`;
  await setCachedValue(
    key,
    serialize(entry),
    getEntryCacheTtlSeconds(date, localToday),
  );
}

export async function getCachedEntry(
  userId: string,
  date: string,
  localToday?: string,
) {
  return getOrSetUserEntryCache<CachedEntry | null>(
    userId,
    `entry:${date}`,
    getEntryCacheTtlSeconds(date, localToday),
    async () => {
      await connectDB();
      return Entry.findOne({ userId, date }).lean();
    },
  );
}

export async function getCachedEntrySummaries(userId: string, limit: number) {
  return getOrSetUserEntryCache<CachedEntry[]>(
    userId,
    `summaries:${limit}`,
    LIST_CACHE_TTL_SECONDS,
    async () => {
      await connectDB();
      return Entry.find(
        { userId },
        {
          date: 1,
          title: 1,
          wordCount: 1,
          contentText: 1,
          contentHtml: 1,
          mood: 1,
        },
      )
        .sort({ date: -1 })
        .limit(limit)
        .lean();
    },
  );
}

export async function getCachedEntryPage(
  userId: string,
  page: number,
  limit: number,
) {
  return getOrSetUserEntryCache<{
    entries: CachedEntry[];
    total: number;
  }>(userId, `page:${page}:${limit}`, LIST_CACHE_TTL_SECONDS, async () => {
    await connectDB();
    const [entries, total] = await Promise.all([
      Entry.find(
        { userId },
        {
          date: 1,
          title: 1,
          wordCount: 1,
          contentText: 1,
          contentHtml: 1,
          mood: 1,
        },
      )
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Entry.countDocuments({ userId }),
    ]);

    return { entries, total };
  });
}

export async function getCachedEntryStats(userId: string) {
  return getOrSetUserEntryCache<EntryStats>(
    userId,
    "stats",
    LIST_CACHE_TTL_SECONDS,
    async () => {
      await connectDB();
      const [stats] = await Entry.aggregate([
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

      return stats ?? { totalEntries: 0, totalWords: 0, averageWords: 0 };
    },
  );
}

export async function getCachedEntryDates(userId: string) {
  return getOrSetUserEntryCache<{ date: string }[]>(
    userId,
    "dates",
    LIST_CACHE_TTL_SECONDS,
    async () => {
      await connectDB();
      return Entry.find({ userId }, { date: 1 }).sort({ date: -1 }).lean();
    },
  );
}

export async function getCachedFlashbackEntries(userId: string) {
  return getOrSetUserEntryCache<CachedEntry[]>(
    userId,
    "flashback",
    LIST_CACHE_TTL_SECONDS,
    async () => {
      await connectDB();
      return Entry.find(
        { userId },
        {
          date: 1,
          title: 1,
          wordCount: 1,
          contentText: 1,
          contentHtml: 1,
        },
      ).lean();
    },
  );
}
