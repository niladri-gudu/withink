"use server";

import { z } from "zod";

import { getRequestSession } from "@/lib/request-cache";
import { addDays, getLocalDateString, isDateString } from "@/lib/utils/date";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { LockService } from "@/features/lock/services/lock-service";

import {
  JournalService,
  type DecryptedEntry,
} from "../services/journal-service";
import { saveEntrySchema } from "../validation/entry-schema";

export async function getEntryAction(
  date: string,
  today: string,
): Promise<{ success: boolean; data?: DecryptedEntry | null; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const entry = await JournalService.getEntryForDate(
      session.user.id,
      date,
      today,
    );
    return { success: true, data: entry };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function saveEntryAction(
  inputData: unknown,
  userLocalToday: string,
): Promise<{ success: boolean; data?: DecryptedEntry; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    // 1. Validate fields using Zod
    const validated = saveEntrySchema.parse(inputData);

    // 2. Resolve the plan's backfill window (Free 14d · Plus 90d · Pro ∞)
    const entitlements = await EntitlementsService.getEntitlements(
      session.user.id,
    );

    // 3. Delegate to JournalService
    const entry = await JournalService.saveJournalEntry(
      session.user.id,
      validated.date,
      {
        title: validated.title,
        mood: validated.mood,
        contentHtml: validated.contentHtml,
        contentText: validated.contentText,
        contentJson: validated.contentJson,
        wordCount: validated.wordCount,
      },
      userLocalToday,
      { backfillDays: entitlements.backfillDays },
    );

    return { success: true, data: entry };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

// Pagination and filter arguments come from the client (Server Action args
// are attacker-controlled) — clamp them before they reach Mongo so a crafted
// call can't dump the whole collection or inject query operators.
const entriesListArgsSchema = z.object({
  page: z.number().int().min(1).max(10_000),
  limit: z.number().int().min(1).max(50),
  filters: z
    .object({
      search: z.string().trim().max(200).optional(),
      mood: z.number().int().min(1).max(5).nullable().optional(),
      timeFilter: z.enum(["all", "week", "month"]).optional(),
      today: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .optional(),
});

export async function getEntriesListAction(
  page: number,
  limit: number,
  filters?: {
    search?: string;
    mood?: number | null;
    timeFilter?: "all" | "week" | "month";
    today?: string;
  },
): Promise<{
  success: boolean;
  data?: { entries: DecryptedEntry[]; total: number };
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const parsed = entriesListArgsSchema.parse({ page, limit, filters });

    // Search is an escaped-but-unindexed $regex scan plus a parallel count —
    // throttle per user so a scripted client can't pin shared Mongo CPU.
    const limit_ = await rateLimit(`entries-list:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    const result = await JournalService.getEntriesPage(
      session.user.id,
      parsed.page,
      parsed.limit,
      parsed.filters,
    );
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid request" };
    }
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getStreakAndStatsAction(localToday: string): Promise<{
  success: boolean;
  data?: {
    currentStreak: number;
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  };
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const [dates, stats] = await Promise.all([
      JournalService.getEntryDates(session.user.id),
      JournalService.getEntryStats(session.user.id),
    ]);

    if (dates.length === 0) {
      return {
        success: true,
        data: {
          currentStreak: 0,
          totalEntries: 0,
          totalWords: stats.totalWords,
          averageWords: stats.averageWords,
        },
      };
    }

    const today = isDateString(localToday) ? localToday : getLocalDateString();
    const yesterday = addDays(today, -1);
    const lastEntryDate = dates[0];

    let currentStreak = 0;
    const totalEntries = dates.length;

    if (lastEntryDate === today || lastEntryDate === yesterday) {
      let expectedDate = lastEntryDate;
      for (const entryDate of dates) {
        if (entryDate === expectedDate) {
          currentStreak++;
          expectedDate = addDays(expectedDate, -1);
        } else if (entryDate < expectedDate) {
          break;
        }
      }
    }

    return {
      success: true,
      data: {
        currentStreak,
        totalEntries,
        totalWords: stats.totalWords,
        averageWords: stats.averageWords,
      },
    };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getEntryDatesAction(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const dates = await JournalService.getEntryDates(session.user.id);
    return { success: true, data: dates };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export interface CalendarEntry {
  date: string;
  mood: number | null;
  wordCount: number;
}

export async function getCalendarEntriesAction(): Promise<{
  success: boolean;
  data?: CalendarEntry[];
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const entries = await JournalService.getCalendarEntries(session.user.id);
    return { success: true, data: entries };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function deleteEntryAction(
  date: string,
): Promise<{ success: boolean; data?: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const deleted = await JournalService.deleteEntry(session.user.id, date);
    return { success: true, data: deleted };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getAllEntriesAction(): Promise<{
  success: boolean;
  data?: DecryptedEntry[];
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const entries = await JournalService.getAllEntriesForExport(
      session.user.id,
    );
    return { success: true, data: entries };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Lightweight variant of `getAllEntriesAction` for the media lightbox: returns
 * every entry WITHOUT the bulky `contentJson` blob, since the lightbox only
 * scans `contentHtml` for image URLs.
 */
export async function getMediaEntriesAction(): Promise<{
  success: boolean;
  data?: DecryptedEntry[];
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const entries = await JournalService.getAllEntriesForMedia(session.user.id);
    return { success: true, data: entries };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getEntrySyncListAction(): Promise<{
  success: boolean;
  data?: { date: string; updatedAt: string }[];
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const list = await JournalService.getEntrySyncList(session.user.id);
    const data = list.map((item) => ({
      date: item.date,
      updatedAt:
        item.updatedAt instanceof Date
          ? item.updatedAt.toISOString()
          : new Date(item.updatedAt).toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
