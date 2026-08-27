import { revalidateTag } from "next/cache";
import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import {
  getCachedValue,
  incrementCachedValue,
  setCachedValue,
} from "@/lib/redis";
import { addDays, getLocalDateString, isDateString } from "@/lib/utils/date";
import { serialize } from "@/lib/utils/serialize";

import { EntryModel, type IEntry } from "./entry-model";

const HOT_ENTRY_CACHE_TTL_SECONDS = 120;
const ARCHIVE_ENTRY_CACHE_TTL_SECONDS = 7200;
const ENTRY_VERSION_TTL_SECONDS = 2592000;
const LIST_CACHE_TTL_SECONDS = 120;

function getEntryCacheTtlSeconds(date: string, localToday?: string) {
  const today = isDateString(localToday) ? localToday : getLocalDateString();
  const yesterday = addDays(today, -1);

  if (date === today || date === yesterday) {
    return HOT_ENTRY_CACHE_TTL_SECONDS;
  }

  return ARCHIVE_ENTRY_CACHE_TTL_SECONDS;
}

export class EntryRepository {
  // Sentinel stored in Redis for "no entry exists" so empty-day reads are
  // served from cache instead of re-hitting Mongo on every request. Stored
  // values are JSON-encoded, so this plain string can never collide with a
  // serialized entry object.
  private static readonly NULL_ENTRY_SENTINEL = "__withink_null__";

  /**
   * Escapes user input before embedding it in a Mongo $regex. Raw input
   * would let special characters throw or craft backtracking patterns that
   * pin DB CPU (ReDoS) across the whole collection scan.
   */
  private static escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static async getUserEntryVersion(userId: string): Promise<number> {
    const key = `entries:${userId}:version`;
    const version = await getCachedValue<number>(key);

    if (version !== null) return version;

    // Default to version 1
    await setCachedValue(key, 1, ENTRY_VERSION_TTL_SECONDS);
    return 1;
  }

  /**
   * Bumps the user's cache version so all version-keyed structures (entry
   * reads, page lists, stats, dates) are re-read from Mongo on their next
   * access. Returns the new version so callers can write hot entries under it
   * without an extra Redis GET.
   *
   * Render-safe: contains no Next cache APIs, so it may run inside RSC
   * renders (e.g. the notebooks bootstrap backfill).
   */
  static async bumpUserEntryVersion(userId: string): Promise<number | null> {
    return await incrementCachedValue(`entries:${userId}:version`);
  }

  /**
   * Bumps the version AND invalidates derived `use cache` views (insights).
   * The tag call is illegal during render, so render-time paths (bootstrap
   * backfill) use bumpUserEntryVersion instead — entry writes go through
   * this one from actions/route handlers only.
   */
  static async invalidateUserEntryCache(
    userId: string,
  ): Promise<number | null> {
    const newVersion = await this.bumpUserEntryVersion(userId);
    // Invalidate any cached derived views (e.g. insights) for this user. The
    // profile arg is required by Next 16's revalidateTag signature; the
    // re-fetched entry re-applies its own cacheLife on the next render.
    revalidateTag(`insights:${userId}`, "default");
    return newVersion;
  }

  static async getEntry(
    userId: string,
    date: string,
    localToday?: string,
  ): Promise<IEntry | null> {
    const version = await this.getUserEntryVersion(userId);
    const cacheKey = `entries:${userId}:v${version}:entry:${date}`;

    // 1. Try fetching from Redis cache. A stored sentinel means "confirmed
    //    empty" — without it, cached nulls are indistinguishable from misses
    //    and every dashboard read of an empty day pays a Mongo findOne.
    const cached = await getCachedValue<IEntry | string | null>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached === EntryRepository.NULL_ENTRY_SENTINEL
        ? null
        : (cached as IEntry);
    }

    // 2. Fallback to MongoDB
    await connectDB();
    const entry = await (EntryModel as any).findOne({ userId, date }).lean(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const serializedEntry = serialize(entry);

    // 3. Cache the result (including confirmed-empty days via the sentinel)
    const ttl = getEntryCacheTtlSeconds(date, localToday);
    await setCachedValue(
      cacheKey,
      serializedEntry ?? EntryRepository.NULL_ENTRY_SENTINEL,
      ttl,
    );

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await (EntryModel as any).findOneAndUpdate(
      { userId, date },
      {
        $set: data,
        $setOnInsert: { userId, date },
      },
      { upsert: true, new: true, lean: true },
    );

    const serializedEntry = serialize(entry);

    // 2. Invalidate old cached structures by incrementing the version. The
    //    INCR return value is the new version — no follow-up GET round trip.
    const newVersion = await this.invalidateUserEntryCache(userId);

    // 3. Eagerly write the newly saved entry to hot cache under the new version
    const resolvedVersion = newVersion ?? 1;
    const newCacheKey = `entries:${userId}:v${resolvedVersion}:entry:${date}`;
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
      /** Timeline scoped to one notebook (entries-page filter). */
      notebookId?: string;
    },
  ): Promise<{ entries: IEntry[]; total: number }> {
    await connectDB();

    const query: any = { userId }; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (filters?.mood) {
      query.mood = filters.mood;
    }

    if (filters?.notebookId) {
      query.notebookId = filters.notebookId;
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
      filters?.search ||
      filters?.notebookId
    );

    if (filters?.search) {
      // Search is pushed down to Mongo (title / plaintext content / ISO date)
      // so we never load the user's entire collection — including the large
      // contentHtml/contentJson blobs — into memory per keystroke. Zero-knowledge
      // users don't reach this path (their search runs client-side over the
      // IndexedDB cache); their ciphertext never matches a server regex anyway.
      const q = filters.search.trim();
      if (q) {
        // Escape metacharacters so user input can't throw or craft
        // backtracking patterns inside mongod.
        const safe = this.escapeRegExp(q);
        query.$or = [
          { title: { $regex: safe, $options: "i" } },
          { contentText: { $regex: safe, $options: "i" } },
          { date: { $regex: safe, $options: "i" } },
        ];
      }
      const [entries, total] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (EntryModel as any)
          .find(query, { userId: 0, contentHtml: 0, contentJson: 0 })
          .sort({ date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        (EntryModel as any).countDocuments(query), // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);
      return serialize({ entries, total });
    }

    if (!hasFilters) {
      const version = await this.getUserEntryVersion(userId);
      const cacheKey = `entries:${userId}:v${version}:page:${page}:${limit}`;
      const cached = await getCachedValue<{ entries: IEntry[]; total: number }>(
        cacheKey,
      );
      if (cached !== null) {
        return cached;
      }

      const [entries, total] = await Promise.all([
        // Projection mirrors the search branch: timeline rows never need the
        // bulky ciphertext blobs.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (EntryModel as any)
          .find(query, { userId: 0, contentHtml: 0, contentJson: 0 })
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (EntryModel as any)
          .find(query, { userId: 0, contentHtml: 0, contentJson: 0 })
          .sort({ date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        (EntryModel as any).countDocuments(query), // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);
      return serialize({ entries, total });
    }
  }

  static async getEntryStats(userId: string): Promise<{
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  }> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsArray = await (EntryModel as any).aggregate([
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

    const stats = statsArray[0] || {
      totalEntries: 0,
      totalWords: 0,
      averageWords: 0,
    };
    const serializedResult = serialize(stats);
    await setCachedValue(cacheKey, serializedResult, LIST_CACHE_TTL_SECONDS);
    return serializedResult;
  }

  static async getEntryDates(
    userId: string,
  ): Promise<{ date: string; mood: number | null; wordCount: number }[]> {
    const version = await this.getUserEntryVersion(userId);
    const cacheKey = `entries:${userId}:v${version}:dates`;
    const cached =
      await getCachedValue<
        { date: string; mood: number | null; wordCount: number }[]
      >(cacheKey);
    if (cached !== null) {
      return cached;
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dates = await (EntryModel as any)
      .find({ userId }, { date: 1, mood: 1, wordCount: 1 })
      .sort({ date: -1 })
      .lean();
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

  /**
   * Returns every entry WITHOUT the bulky Tiptap `contentJson` blob. Used by the
   * media lightbox, which only scans `contentHtml` for image URLs — shipping the
   * JSON ciphertext for the whole journal on every lightbox open is wasted
   * bandwidth. Deletes re-fetch the full entry on demand.
   */
  static async getAllEntriesForMedia(userId: string): Promise<IEntry[]> {
    await connectDB();
    const entries = await (EntryModel as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .find(
        { userId },
        {
          date: 1,
          title: 1,
          mood: 1,
          wordCount: 1,
          contentHtml: 1,
          contentText: 1,
          updatedAt: 1,
        },
      )
      .sort({ date: 1 })
      .lean();
    return serialize(entries);
  }

  static async getSyncList(
    userId: string,
  ): Promise<{ date: string; updatedAt: Date }[]> {
    // Version-keyed like every other list read, so any save/delete invalidates
    // it automatically. This is on the background-sync hot path (called on
    // every pull), so a stale short-TTL read beats a full Mongo scan.
    const version = await this.getUserEntryVersion(userId);
    const cacheKey = `entries:${userId}:v${version}:sync-list`;
    const cached =
      await getCachedValue<{ date: string; updatedAt: string }[]>(cacheKey);
    if (cached !== null) {
      return cached as unknown as { date: string; updatedAt: Date }[];
    }

    await connectDB();
    const entries = await (EntryModel as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .find({ userId }, { date: 1, updatedAt: 1 })
      .sort({ date: -1 })
      .lean();
    const serializedResult = serialize(entries);
    await setCachedValue(cacheKey, serializedResult, LIST_CACHE_TTL_SECONDS);
    return serializedResult;
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

  // ---------------------------------------------------------------------
  // Notebook filing (see features/notebooks). Entries stay unique per
  // (userId, date); notebookId only records which notebook an entry is
  // filed under and never participates in the save/upsert path — it is
  // set at creation via saveEntry's payload or by explicit moves below.
  // ---------------------------------------------------------------------

  /** Entries filed in one notebook (delete-notebook guard). */
  static async countByNotebook(
    userId: string,
    notebookId: string,
  ): Promise<number> {
    if (!notebookId) return 0;
    await connectDB();
    const count = await (EntryModel as Model<IEntry>).countDocuments({
      userId,
      notebookId,
    });
    return count;
  }

  /**
   * Per-notebook entry counts + last-written timestamps for the notebooks
   * page. Legacy rows (notebookId null) are backfilled to the default
   * notebook during bootstrap, so a null group here is defensive only.
   */
  static async getNotebookUsage(
    userId: string,
  ): Promise<Map<string, { count: number; lastWrittenAt: string | null }>> {
    await connectDB();
    const rows = await (EntryModel as Model<IEntry>).aggregate<{
      _id: string | null;
      count: number;
      lastWrittenAt: Date | null;
    }>([
      { $match: { userId: { $eq: userId } } },
      {
        $group: {
          _id: "$notebookId",
          count: { $sum: 1 },
          lastWrittenAt: { $max: "$updatedAt" },
        },
      },
    ]);

    const usage = new Map<
      string,
      { count: number; lastWrittenAt: string | null }
    >();
    for (const row of rows) {
      if (!row?._id) continue;
      usage.set(String(row._id), {
        count: row.count ?? 0,
        lastWrittenAt: row.lastWrittenAt
          ? new Date(row.lastWrittenAt).toISOString()
          : null,
      });
    }
    return usage;
  }

  /**
   * One-time legacy backfill: files pre-notebooks entries (notebookId null)
   * into the user's default notebook. Indexed by the {userId, notebookId}
   * compound index; a no-op once every row has been claimed.
   */
  static async backfillNullNotebooks(
    userId: string,
    defaultNotebookId: string,
  ): Promise<number> {
    await connectDB();
    const result = await (EntryModel as Model<IEntry>).updateMany(
      { userId, notebookId: null },
      { $set: { notebookId: defaultNotebookId } },
    );
    return result?.modifiedCount ?? 0;
  }

  /**
   * Moves an entry between notebooks. Only ever called from the explicit
   * move action — autosave payloads never change an existing entry's
   * notebook (edit-grandfathering for filing, mirroring the date rules).
   * Bumps the entries version so timeline/calendar caches re-read.
   */
  static async setEntryNotebook(
    userId: string,
    date: string,
    notebookId: string,
  ): Promise<boolean> {
    await connectDB();
    const updated = await (EntryModel as Model<IEntry>).findOneAndUpdate(
      { userId, date },
      { $set: { notebookId } },
      { new: true },
    );
    if (!updated) return false;

    await this.invalidateUserEntryCache(userId);
    return true;
  }
}
