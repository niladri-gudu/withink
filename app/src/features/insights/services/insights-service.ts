import "server-only";
import { EntryModel } from "../../journal/repositories/entry-model";
import { connectDB } from "@/lib/db/mongoose";
import { addDays, isDateString, parseLocalDateString } from "@/lib/utils/date";

export interface MonthlyStat {
  month: string; // YYYY-MM
  totalWords: number;
  averageWords: number;
  averageMood: number | null;
  entryCount: number;
  moodDistribution: Record<number, number>;
}

export interface HeatmapDay {
  date: string;
  count: number;
  wordCount: number;
  mood: number | null;
}

export interface InsightsPayload {
  streaks: {
    currentStreak: number;
    longestStreak: number;
  };
  heatmap: HeatmapDay[];
  moodStats: {
    distribution: Record<number, number>;
    average: number | null;
    monthlyAverages: { month: string; averageMood: number | null; count: number }[];
  };
  wordCountStats: {
    total: number;
    average: number;
    monthlyTotals: { month: string; totalWords: number; averageWords: number; count: number }[];
  };
  activitySummaries: {
    mostActiveDayOfWeek: { day: string; count: number } | null;
    mostActiveTimeOfDay: { period: string; count: number } | null;
  };
  monthlyOverview: Record<string, MonthlyStat>;
}

export class InsightsService {
  /**
   * Generates all insights and analytics for a user.
   * @param userId User's database ID
   * @param todayStr User's local date string (YYYY-MM-DD)
   * @param timezoneOffset User's local timezone offset in minutes (e.g. -330 for UTC+5:30)
   */
  static async getInsights(
    userId: string,
    todayStr: string,
    timezoneOffset = 0
  ): Promise<InsightsPayload> {
    if (!isDateString(todayStr)) {
      throw new Error("Invalid date string. Expected YYYY-MM-DD.");
    }

    await connectDB();

    // 1. Fetch only metadata for all entries for the user, sorted chronologically by date
    const entries = await (EntryModel as any).find( // eslint-disable-line @typescript-eslint/no-explicit-any
      { userId },
      { date: 1, wordCount: 1, mood: 1, createdAt: 1 }
    )
      .sort({ date: 1 })
      .lean();

    // 2. Initialize default payload
    const payload: InsightsPayload = {
      streaks: { currentStreak: 0, longestStreak: 0 },
      heatmap: [],
      moodStats: {
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        average: null,
        monthlyAverages: [],
      },
      wordCountStats: {
        total: 0,
        average: 0,
        monthlyTotals: [],
      },
      activitySummaries: {
        mostActiveDayOfWeek: null,
        mostActiveTimeOfDay: null,
      },
      monthlyOverview: {},
    };

    if (entries.length === 0) {
      // Return empty heatmap for the past 365 days
      payload.heatmap = this.generateEmptyHeatmap(todayStr);
      return payload;
    }

    // 3. Compute Streaks
    const dates = entries.map((e: { date: string }) => e.date);
    payload.streaks = this.calculateStreaks(dates, todayStr);

    // 4. Heatmap data (last 365 days leading to todayStr)
    const entryMap = new Map<string, { wordCount: number; mood: number | null }>();
    let totalWords = 0;
    let totalMoodSum = 0;
    let moodCount = 0;

    const weekdayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const timeOfDayCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    // Grouping variables for month summaries
    const monthlyGroups: Record<
      string,
      {
        words: number;
        moods: number[];
        entries: { date: string; wordCount?: number; mood?: number | null; createdAt?: Date }[];
      }
    > = {};

    for (const entry of entries) {
      entryMap.set(entry.date, {
        wordCount: entry.wordCount || 0,
        mood: entry.mood ?? null,
      });

      // Overall stats
      totalWords += entry.wordCount || 0;
      if (entry.mood && entry.mood >= 1 && entry.mood <= 5) {
        const moodVal = entry.mood;
        const currentCount = payload.moodStats.distribution[moodVal] || 0;
        payload.moodStats.distribution[moodVal] = currentCount + 1;
        totalMoodSum += entry.mood;
        moodCount++;
      }

      // Day of Week calculation (using local date string parsing)
      const parsedDate = parseLocalDateString(entry.date);
      const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      weekdayCounts[dayOfWeek] = (weekdayCounts[dayOfWeek] || 0) + 1;

      // Time of Day calculation (adjusting UTC createdAt by timezoneOffset)
      if (entry.createdAt) {
        const createdAtTime = new Date(entry.createdAt).getTime();
        // timezoneOffset is in minutes, e.g., -330. To get local time, subtract offset from UTC.
        // e.g. UTC time + offset_ms
        const localCreatedDate = new Date(createdAtTime - timezoneOffset * 60 * 1000);
        const localHour = localCreatedDate.getUTCHours();

        let period = "night";
        if (localHour >= 5 && localHour < 12) {
          period = "morning";
        } else if (localHour >= 12 && localHour < 18) {
          period = "afternoon";
        } else if (localHour >= 18 && localHour < 22) {
          period = "evening";
        }
        const currentCount = timeOfDayCounts[period] || 0;
        timeOfDayCounts[period] = currentCount + 1;
      }

      // Monthly aggregation
      const monthStr = entry.date.substring(0, 7); // YYYY-MM
      if (!monthlyGroups[monthStr]) {
        monthlyGroups[monthStr] = { words: 0, moods: [], entries: [] };
      }
      monthlyGroups[monthStr].words += entry.wordCount || 0;
      if (entry.mood && entry.mood >= 1 && entry.mood <= 5) {
        monthlyGroups[monthStr].moods.push(entry.mood);
      }
      monthlyGroups[monthStr].entries.push(entry);
    }

    // Assign overall metrics
    payload.wordCountStats.total = totalWords;
    payload.wordCountStats.average = Math.round(totalWords / entries.length);
    payload.moodStats.average = moodCount > 0 ? parseFloat((totalMoodSum / moodCount).toFixed(1)) : null;

    // Heatmap construction
    payload.heatmap = this.generateHeatmap(entryMap, todayStr);

    // Activity Summaries
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let maxDayCount = -1;
    let bestDay = "";
    for (const [dayIdx, count] of Object.entries(weekdayCounts)) {
      if (count > maxDayCount) {
        maxDayCount = count;
        bestDay = weekdays[Number(dayIdx)]!;
      }
    }
    payload.activitySummaries.mostActiveDayOfWeek = maxDayCount > 0 ? { day: bestDay, count: maxDayCount } : null;

    let maxTimeCount = -1;
    let bestPeriod = "";
    for (const [period, count] of Object.entries(timeOfDayCounts)) {
      if (count > maxTimeCount) {
        maxTimeCount = count;
        bestPeriod = period;
      }
    }
    payload.activitySummaries.mostActiveTimeOfDay = maxTimeCount > 0 ? { period: bestPeriod, count: maxTimeCount } : null;

    // Monthly Overview details & Trends
    const sortedMonths = Object.keys(monthlyGroups).sort();
    
    // Monthly aggregates
    for (const month of sortedMonths) {
      const group = monthlyGroups[month]!;
      const moodDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let moodSum = 0;
      let monthMoodCount = 0;

      for (const entry of group.entries) {
        if (entry.mood && entry.mood >= 1 && entry.mood <= 5) {
          const moodVal = entry.mood;
          const currentCount = moodDistribution[moodVal] || 0;
          moodDistribution[moodVal] = currentCount + 1;
          moodSum += entry.mood;
          monthMoodCount++;
        }
      }

      payload.monthlyOverview[month] = {
        month,
        totalWords: group.words,
        averageWords: group.entries.length > 0 ? Math.round(group.words / group.entries.length) : 0,
        averageMood: monthMoodCount > 0 ? parseFloat((moodSum / monthMoodCount).toFixed(1)) : null,
        entryCount: group.entries.length,
        moodDistribution,
      };
    }

    // Last 6 months trend lines
    const last6Months: string[] = [];
    let curMonthStr = todayStr.substring(0, 7);
    for (let i = 0; i < 6; i++) {
      last6Months.unshift(curMonthStr);
      // Go to previous month
      const [y, m] = curMonthStr.split("-").map(Number);
      if (m === 1) {
        curMonthStr = `${y! - 1}-12`;
      } else {
        curMonthStr = `${y!}-${String(m! - 1).padStart(2, "0")}`;
      }
    }

    for (const month of last6Months) {
      const monthData = payload.monthlyOverview[month];
      payload.moodStats.monthlyAverages.push({
        month,
        averageMood: monthData?.averageMood ?? null,
        count: monthData?.entryCount ?? 0,
      });

      payload.wordCountStats.monthlyTotals.push({
        month,
        totalWords: monthData?.totalWords ?? 0,
        averageWords: monthData?.averageWords ?? 0,
        count: monthData?.entryCount ?? 0,
      });
    }

    return payload;
  }

  /**
   * Calculates current and longest streaks from sorted unique date strings (ascending).
   */
  private static calculateStreaks(
    dates: string[],
    todayStr: string
  ): { currentStreak: number; longestStreak: number } {
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Remove potential duplicates and ensure they are sorted ascending
    const uniqueDates = Array.from(new Set(dates)).sort();

    // 1. Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = uniqueDates[i - 1]!;
      const currDate = uniqueDates[i]!;

      if (addDays(prevDate, 1) === currDate) {
        tempStreak++;
      } else if (prevDate !== currDate) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // 2. Calculate current streak
    let currentStreak = 0;
    const yesterdayStr = addDays(todayStr, -1);
    const lastDate = uniqueDates[uniqueDates.length - 1]!;

    if (lastDate === todayStr || lastDate === yesterdayStr) {
      currentStreak = 1;
      let expectedDate = lastDate;
      
      // Iterate backwards from the end of the array
      for (let i = uniqueDates.length - 2; i >= 0; i--) {
        const prevExpected = addDays(expectedDate, -1);
        if (uniqueDates[i] === prevExpected) {
          currentStreak++;
          expectedDate = prevExpected;
        } else {
          break;
        }
      }
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Helper to generate a 365-day empty heatmap array leading up to today.
   */
  private static generateEmptyHeatmap(todayStr: string): HeatmapDay[] {
    const heatmap: HeatmapDay[] = [];
    for (let i = 364; i >= 0; i--) {
      const date = addDays(todayStr, -i);
      heatmap.push({ date, count: 0, wordCount: 0, mood: null });
    }
    return heatmap;
  }

  /**
   * Helper to generate heatmap with entries populated.
   */
  private static generateHeatmap(
    entryMap: Map<string, { wordCount: number; mood: number | null }>,
    todayStr: string
  ): HeatmapDay[] {
    const heatmap: HeatmapDay[] = [];
    for (let i = 364; i >= 0; i--) {
      const date = addDays(todayStr, -i);
      const entry = entryMap.get(date);
      if (entry) {
        heatmap.push({
          date,
          count: 1,
          wordCount: entry.wordCount,
          mood: entry.mood,
        });
      } else {
        heatmap.push({
          date,
          count: 0,
          wordCount: 0,
          mood: null,
        });
      }
    }
    return heatmap;
  }
}
