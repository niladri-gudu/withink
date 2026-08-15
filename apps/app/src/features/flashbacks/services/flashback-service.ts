import "server-only";

import { CACHE_KEYS } from "@/constants/cache-keys";
import { getCachedValue, redis, setCachedValue } from "@/lib/redis";
import { addDays, isDateString } from "@/lib/utils/date";
import { logger } from "@/server/logger";

import {
  JournalService,
  type DecryptedEntry,
} from "../../journal/services/journal-service";

export interface FlashbackResponse {
  entry: DecryptedEntry | null;
  label: string;
}

export class FlashbackService {
  /**
   * Retrieves today's flashback entry. Checks cache first, otherwise selects
   * a new one prioritizing anniversary entries and then random archives,
   * avoiding recently seen entries.
   */
  static async getFlashbackForToday(
    userId: string,
    todayStr: string,
  ): Promise<FlashbackResponse | null> {
    if (!isDateString(todayStr)) {
      return null;
    }

    const cacheKey = CACHE_KEYS.FLASHBACK(userId, todayStr);

    // 1. Check Redis cache for today's selected flashback
    const cached = await getCachedValue<{ entryDate: string; label: string }>(
      cacheKey,
    );
    if (cached) {
      const entry = await JournalService.getEntryForDate(
        userId,
        cached.entryDate,
        todayStr,
      );
      if (entry) {
        return { entry, label: cached.label };
      }
      // If cached entry no longer exists (deleted), clear cache and proceed
      if (redis) {
        try {
          await redis.del(cacheKey);
        } catch (e) {
          logger.error(
            "Failed to delete stale flashback cache key",
            e as Error,
            { cacheKey },
          );
        }
      }
    }

    // 2. Fetch all entry dates to find a candidate
    const dates = await JournalService.getEntryDates(userId);
    if (dates.length === 0) {
      return null;
    }

    const yesterday = addDays(todayStr, -1);
    const pastDates = dates.filter((d) => d < yesterday);
    if (pastDates.length === 0) {
      return null;
    }

    // 3. Selection Logic
    let selectedDate: string | null = null;
    let label = "";

    // A. Anniversary memories priority
    const todayMMDD = todayStr.substring(5); // gets "-MM-DD"
    const anniversaryDates = pastDates.filter((d) => d.endsWith(todayMMDD));

    if (anniversaryDates.length > 0) {
      const [todayYear] = todayStr.split("-").map(Number);
      const oneYearAgoStr = `${todayYear! - 1}-${todayMMDD}`;

      // Check if exactly 1 year ago is available
      if (anniversaryDates.includes(oneYearAgoStr)) {
        selectedDate = oneYearAgoStr;
        label = "Exactly one year ago today";
      } else {
        // Pick the most recent anniversary date
        selectedDate = anniversaryDates[0]!;
        const [anniversaryYear] = selectedDate.split("-").map(Number);
        const yearsAgo = todayYear! - anniversaryYear!;
        label = `Exactly ${yearsAgo} ${yearsAgo === 1 ? "year" : "years"} ago today`;
      }
    }

    // B. Random flashback fallback (with history tracking)
    if (!selectedDate) {
      const historyKey = `user:${userId}:flashback-history`;
      const history = (await getCachedValue<string[]>(historyKey)) || [];

      // Filter past dates to exclude those shown recently
      let candidates = pastDates.filter((d) => !history.includes(d));
      if (candidates.length === 0) {
        candidates = pastDates;
      }

      const randomIndex = Math.floor(Math.random() * candidates.length);
      selectedDate = candidates[randomIndex]!;
      label = "A reflection from your archives";

      // Update history tracking in Redis (keep last 10 entries)
      const updatedHistory = [
        selectedDate,
        ...history.filter((d) => d !== selectedDate),
      ].slice(0, 10);

      // Save history with a 30-day TTL (2592000 seconds). Fire-and-forget:
      // the selection is already made, so this write must not add latency.
      void setCachedValue(historyKey, updatedHistory, 2592000);
    }

    // 4. Cache today's flashback choice for 24 hours (86400 seconds). The
    //    entry is returned immediately; the write is best-effort.
    void setCachedValue(cacheKey, { entryDate: selectedDate, label }, 86400);

    const entry = await JournalService.getEntryForDate(
      userId,
      selectedDate,
      todayStr,
    );
    return { entry, label };
  }

  /**
   * Invalidates today's flashback cache and forces selection of a different flashback
   */
  static async refreshFlashback(
    userId: string,
    todayStr: string,
  ): Promise<FlashbackResponse | null> {
    if (!isDateString(todayStr)) {
      return null;
    }

    const cacheKey = CACHE_KEYS.FLASHBACK(userId, todayStr);

    // Delete current cache for today
    if (redis) {
      try {
        await redis.del(cacheKey);
      } catch (e) {
        logger.error(
          "Failed to delete flashback cache key during refresh",
          e as Error,
          { cacheKey },
        );
      }
    }

    // Get all dates
    const dates = await JournalService.getEntryDates(userId);
    const yesterday = addDays(todayStr, -1);
    const pastDates = dates.filter((d) => d < yesterday);
    if (pastDates.length === 0) {
      return null;
    }

    const historyKey = `user:${userId}:flashback-history`;
    const history = (await getCachedValue<string[]>(historyKey)) || [];

    // Filter candidates (excluding history)
    let candidates = pastDates.filter((d) => !history.includes(d));
    if (candidates.length === 0) {
      candidates = pastDates;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selectedDate = candidates[randomIndex]!;
    const label = "A reflection from your archives";

    // Update history tracking
    const updatedHistory = [
      selectedDate,
      ...history.filter((d) => d !== selectedDate),
    ].slice(0, 10);

    void setCachedValue(historyKey, updatedHistory, 2592000);

    // Cache today's flashback choice
    void setCachedValue(cacheKey, { entryDate: selectedDate, label }, 86400);

    const entry = await JournalService.getEntryForDate(
      userId,
      selectedDate,
      todayStr,
    );
    return { entry, label };
  }
}
