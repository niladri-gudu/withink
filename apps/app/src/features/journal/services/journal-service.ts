import "server-only";

import { addDays, isDateString } from "@/lib/utils/date";
import { BusinessRuleError, ValidationError } from "@/server/errors";

import type { IEntry } from "../repositories/entry-model";
import { EntryRepository } from "../repositories/entry-repository";

export interface DecryptedEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  wordCount: number;
  mood: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class JournalService {
  /**
   * Normalizes a stored entry into a client-safe plain object.
   *
   * Zero-knowledge only: content fields are client-encrypted blobs that the
   * server cannot decrypt, so they are returned as-is. Plain JSON documents
   * (legacy/plaintext records) are parsed so callers keep working.
   */
  private static decryptEntry(entry: IEntry): DecryptedEntry {
    const contentHtml = entry.contentHtml || "";
    const contentText = entry.contentText || "";
    const contentJsonRaw = entry.contentJson || "";

    let contentJson: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (contentJsonRaw) {
      try {
        contentJson = JSON.parse(contentJsonRaw);
      } catch {
        // Not valid JSON: it's a client-encrypted ciphertext string.
        contentJson = contentJsonRaw;
      }
    }

    return {
      id: entry._id ? (entry._id as any).toString() : "", // eslint-disable-line @typescript-eslint/no-explicit-any
      userId: entry.userId,
      date: entry.date,
      title: entry.title || "",
      contentHtml,
      contentText,
      contentJson,
      wordCount: entry.wordCount || 0,
      mood: entry.mood ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Retrieves a journal entry for a user on a given date.
   */
  static async getEntryForDate(
    userId: string,
    date: string,
    localToday?: string,
  ): Promise<DecryptedEntry | null> {
    if (!isDateString(date)) {
      throw new ValidationError(
        "Invalid date string format. Expected YYYY-MM-DD.",
      );
    }

    const entry = await EntryRepository.getEntry(userId, date, localToday);
    if (!entry) return null;

    return this.decryptEntry(entry);
  }

  /**
   * Saves a journal entry (creates or updates), enforcing formatting and daily grace periods.
   */
  static async saveJournalEntry(
    userId: string,
    date: string,
    data: {
      title?: string;
      mood?: number | null;
      contentHtml?: string;
      contentText?: string;
      contentJson?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      wordCount?: number;
    },
    userLocalToday: string,
  ): Promise<DecryptedEntry> {
    if (!isDateString(date) || !isDateString(userLocalToday)) {
      throw new ValidationError("Invalid date strings provided.");
    }

    // 1. Retrieve the existing entry to see if this is a creation or update
    const existingEntry = await EntryRepository.getEntry(
      userId,
      date,
      userLocalToday,
    );

    // 2. If it's a NEW entry, enforce the daily journaling window rules
    if (!existingEntry) {
      const yesterdayStr = addDays(userLocalToday, -1);

      // Rule A: Cannot write in the future
      if (date > userLocalToday) {
        throw new BusinessRuleError(
          "The future is unwritten. You cannot write journal entries for future dates.",
        );
      }

      // Rule B: Cannot write old entries outside the 1-day grace period
      if (date < yesterdayStr) {
        throw new BusinessRuleError(
          "Grace period expired. New journal entries can only be created for today or yesterday.",
        );
      }
    }

    // 3. Construct update payload. Zero-knowledge only: content fields are
    //    already encrypted by the client, so they are stored as-is. (The legacy
    //    server-side encryption path has been removed.)
    const updatePayload: Partial<Omit<IEntry, "userId" | "date">> = {};

    if (data.title !== undefined) {
      updatePayload.title = data.title;
    }

    if (data.mood !== undefined) {
      updatePayload.mood = data.mood;
    }

    if (data.contentHtml !== undefined) {
      updatePayload.contentHtml = data.contentHtml;
    }
    if (data.contentText !== undefined) {
      updatePayload.contentText = data.contentText;
      updatePayload.wordCount = data.wordCount ?? 0;
    }
    if (data.contentJson !== undefined) {
      updatePayload.contentJson =
        typeof data.contentJson === "string"
          ? data.contentJson
          : JSON.stringify(data.contentJson);
    }

    // 4. Save through the repository
    const entry = await EntryRepository.saveEntry(
      userId,
      date,
      updatePayload,
      userLocalToday,
    );

    return this.decryptEntry(entry);
  }

  /**
   * Retrieves a paginated list of entries, decrypted and formatted.
   */
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
  ): Promise<{ entries: DecryptedEntry[]; total: number }> {
    if (filters?.search) {
      // Search is executed by the repository (Mongo regex on title /
      // plaintext content / ISO date) with projection + pagination, so we
      // never pull the whole collection into memory to filter in JS.
      const { entries, total } = await EntryRepository.getEntriesPage(
        userId,
        page,
        limit,
        filters,
      );
      const decrypted = entries.map((entry) => this.decryptEntry(entry));
      return { entries: decrypted, total };
    }

    const { entries, total } = await EntryRepository.getEntriesPage(
      userId,
      page,
      limit,
      filters,
    );
    const decryptedEntries = entries.map((entry) => this.decryptEntry(entry));
    return { entries: decryptedEntries, total };
  }

  /**
   * Retrieves consistency metrics for the user's diary.
   */
  static async getEntryStats(userId: string): Promise<{
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  }> {
    return await EntryRepository.getEntryStats(userId);
  }

  /**
   * Retrieves the dates of all entries written by a user.
   */
  static async getEntryDates(userId: string): Promise<string[]> {
    const dates = await EntryRepository.getEntryDates(userId);
    return dates.map((d) => d.date);
  }

  /**
   * Retrieves calendar entry data (date, mood, and wordCount) for all entries written by a user.
   */
  static async getCalendarEntries(
    userId: string,
  ): Promise<{ date: string; mood: number | null; wordCount: number }[]> {
    return await EntryRepository.getEntryDates(userId);
  }

  /**
   * Returns every entry for a user, decrypted and chronologically ordered.
   * Intended for full-account exports (data ownership); callers must already
   * have verified that `userId` belongs to the requester.
   */
  static async getAllEntriesForExport(
    userId: string,
  ): Promise<DecryptedEntry[]> {
    const entries = await EntryRepository.getAllEntries(userId);
    return entries.map((entry) => this.decryptEntry(entry));
  }

  /**
   * Returns every entry without the bulky `contentJson` blob, for the media
   * lightbox which only scans `contentHtml` for image URLs.
   */
  static async getAllEntriesForMedia(
    userId: string,
  ): Promise<DecryptedEntry[]> {
    const entries = await EntryRepository.getAllEntriesForMedia(userId);
    return entries.map((entry) => this.decryptEntry(entry));
  }

  static async getEntrySyncList(
    userId: string,
  ): Promise<{ date: string; updatedAt: Date }[]> {
    return await EntryRepository.getSyncList(userId);
  }

  /**
   * Deletes a journal entry for a user on a given date.
   */
  static async deleteEntry(userId: string, date: string): Promise<boolean> {
    if (!isDateString(date)) {
      throw new ValidationError("Invalid date string format.");
    }
    return await EntryRepository.deleteEntry(userId, date);
  }

  /**
   * Selects a random historical entry from the list of dates, excluding today and yesterday.
   */
  static async getRandomFlashback(
    userId: string,
    dates: string[],
    today: string,
  ): Promise<DecryptedEntry | null> {
    const yesterday = addDays(today, -1);
    const pastDates = dates.filter((d) => d < yesterday);
    if (pastDates.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * pastDates.length);
    const randomDate = pastDates[randomIndex]!;
    return await this.getEntryForDate(userId, randomDate, today);
  }
}
