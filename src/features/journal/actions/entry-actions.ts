"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { JournalService } from "../services/journal-service";
import type { DecryptedEntry } from "../services/journal-service";
import { saveEntrySchema } from "../validation/entry-schema";
import { handleError } from "@/server/errors";
import { getLocalDateString, addDays, isDateString } from "@/lib/utils/date";
import { LockService } from "@/features/lock/services/lock-service";

export async function getEntryAction(
  date: string,
  today: string,
): Promise<{ success: boolean; data?: DecryptedEntry | null; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const entry = await JournalService.getEntryForDate(session.user.id, date, today);
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    // 1. Validate fields using Zod
    const validated = saveEntrySchema.parse(inputData);

    // 2. Delegate to JournalService
    const entry = await JournalService.saveJournalEntry(
      session.user.id,
      validated.date,
      {
        title: validated.title,
        mood: validated.mood,
        contentHtml: validated.contentHtml,
        contentText: validated.contentText,
        contentJson: validated.contentJson,
      },
      userLocalToday,
    );

    return { success: true, data: entry };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getEntriesListAction(
  page: number,
  limit: number,
  filters?: {
    search?: string;
    mood?: number | null;
    timeFilter?: "all" | "week" | "month";
    today?: string;
  },
): Promise<{ success: boolean; data?: { entries: DecryptedEntry[]; total: number }; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const result = await JournalService.getEntriesPage(session.user.id, page, limit, filters);
    return { success: true, data: result };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getStreakAndStatsAction(
  localToday: string,
): Promise<{
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
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

export async function getEntryDatesAction(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
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

export async function deleteEntryAction(
  date: string,
): Promise<{ success: boolean; data?: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
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
