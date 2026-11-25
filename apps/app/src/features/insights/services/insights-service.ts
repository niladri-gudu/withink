import "server-only";

import { isDateString } from "@/lib/utils/date";

import { EntryRepository } from "../../journal/repositories/entry-repository";
import { computeInsights, type InsightsPayload } from "./insights-compute";

export type {
  HeatmapDay,
  InsightsEntryInput,
  InsightsPayload,
  MonthlyStat,
} from "./insights-compute";

export class InsightsService {
  /**
   * Generates all insights and analytics for a user.
   *
   * The aggregation itself lives in `insights-compute.ts` so the client can
   * run the identical computation over the decrypted local timeline for
   * zero-knowledge accounts. This method only owns the server data read.
   *
   * @param userId User's database ID
   * @param todayStr User's local date string (YYYY-MM-DD)
   * @param timezoneOffset User's local timezone offset in minutes (e.g. -330 for UTC+5:30)
   */
  static async getInsights(
    userId: string,
    todayStr: string,
    timezoneOffset = 0,
  ): Promise<InsightsPayload> {
    if (!isDateString(todayStr)) {
      throw new Error("Invalid date string. Expected YYYY-MM-DD.");
    }

    // 1. Fetch only metadata for all entries for the user, sorted chronologically by date
    const entries = await EntryRepository.getMetadataForInsights(userId);

    // 2. Aggregate. Pure and shared with the local-first client path.
    return computeInsights(entries, todayStr, timezoneOffset);
  }
}
