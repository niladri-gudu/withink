"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { computeCurrentStreak } from "@withink/core/date";

import { useEncryption } from "@/providers/encryption-provider";

import {
  diaryCacheService,
  type CachedMetadata,
} from "../services/diary-cache-service";

export interface LocalCalendarEntry {
  date: string;
  mood: number | null;
  wordCount: number;
}

export interface LocalStreakStats {
  currentStreak: number;
  totalEntries: number;
  totalWords: number;
  averageWords: number;
}

export interface LocalJournal {
  timeline: CachedMetadata[];
  calendarEntries: LocalCalendarEntry[];
  streakData: LocalStreakStats;
  /** True while the first local read is still resolving. */
  isLoading: boolean;
  /**
   * True while the initial background pull is filling an empty cache. UI should
   * show a "syncing" state instead of the empty state during this window.
   */
  isWarming: boolean;
  /** True when the account is zero-knowledge and unlocked, so local is usable. */
  isLocal: boolean;
}

const EMPTY_STATS: LocalStreakStats = {
  currentStreak: 0,
  totalEntries: 0,
  totalWords: 0,
  averageWords: 0,
};

/**
 * Derives the calendar and folio stats from the decrypted local timeline, and
 * progressively warms the local cache in the background.
 *
 * Progressive migration: an existing cache renders immediately; a cold device
 * shows the timeline skeletons while the first bulk pull fills IndexedDB, then
 * this query invalidates and the calendar/streak appear. Nothing blocks on the
 * pull, and the server copy is never touched.
 */
export function useLocalJournal(localToday: string): LocalJournal {
  const { isClientEncrypted, masterKey } = useEncryption();
  const queryClient = useQueryClient();
  const isLocal = isClientEncrypted && !!masterKey;
  // True while the initial background pull is filling an empty cache.
  const [warming, setWarming] = React.useState(false);

  const query = useQuery({
    queryKey: ["local-journal", localToday, isLocal],
    queryFn: async () => {
      if (!masterKey) return [];
      return await diaryCacheService.getLocalCacheTimeline(masterKey);
    },
    enabled: isLocal,
    // The in-memory timeline cache makes this cheap; re-reading after a write
    // or a pull is preferable to showing a stale calendar.
    staleTime: 0,
  });

  // Warm-up / catch-up. `syncDiaryCache` is single-flight and fast-paths when
  // the server sync list is unchanged, so this is a no-op on a warm device.
  React.useEffect(() => {
    if (!isLocal || !masterKey) return;
    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWarming(true);
    void diaryCacheService
      .syncDiaryCache(masterKey, localToday)
      .finally(() => {
        if (!cancelled) {
          void queryClient.invalidateQueries({ queryKey: ["local-journal"] });
          setWarming(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLocal, masterKey, localToday, queryClient]);

  // Stable reference: `query.data ?? []` would create a new array each render
  // and invalidate the derived useMemos below.
  const timeline = React.useMemo(() => query.data ?? [], [query.data]);

  const calendarEntries = React.useMemo<LocalCalendarEntry[]>(
    () =>
      timeline.map((entry) => ({
        date: entry.date,
        mood: entry.mood,
        wordCount: entry.wordCount,
      })),
    [timeline],
  );

  const streakData = React.useMemo<LocalStreakStats>(() => {
    if (timeline.length === 0) return EMPTY_STATS;
    // `getLocalCacheTimeline` returns most-recent-first.
    const dates = timeline.map((entry) => entry.date);
    const totalEntries = timeline.length;
    const totalWords = timeline.reduce(
      (sum, entry) => sum + (entry.wordCount || 0),
      0,
    );
    return {
      currentStreak: computeCurrentStreak(dates, localToday),
      totalEntries,
      totalWords,
      averageWords:
        totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0,
    };
  }, [timeline, localToday]);

  // Only the empty-cache window counts as warming: a warm cache must never
  // flash a syncing state while the fast manifest check runs.
  const isWarming =
    isLocal && warming && !query.isPending && timeline.length === 0;

  return {
    timeline,
    calendarEntries,
    streakData,
    isLoading: isLocal && query.isPending,
    isWarming,
    isLocal,
  };
}
