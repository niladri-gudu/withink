/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InsightsService } from "./insights-service";
import { EntryModel } from "../../journal/repositories/entry-model";

// Mock connectDB and EntryModel
vi.mock("@/lib/db/mongoose", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../journal/repositories/entry-model", () => ({
  EntryModel: {
    find: vi.fn(),
  },
}));

describe("InsightsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-abc";
  const mockToday = "2026-07-02";

  it("should return empty default payload if user has zero entries", async () => {
    // Mock EntryModel.find returning a mock query object chain
    const mockFindChain = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(EntryModel.find).mockReturnValue(mockFindChain as any);

    const payload = await InsightsService.getInsights(mockUserId, mockToday);

    expect(payload.streaks.currentStreak).toBe(0);
    expect(payload.streaks.longestStreak).toBe(0);
    expect(payload.heatmap.length).toBe(365);
    expect(payload.heatmap[364]?.date).toBe("2026-07-02");
    expect(payload.heatmap[364]?.count).toBe(0);
    expect(payload.moodStats.average).toBeNull();
    expect(payload.wordCountStats.total).toBe(0);
  });

  it("should calculate correct streaks and aggregations for mock entries", async () => {
    const mockEntries = [
      {
        date: "2026-06-28",
        wordCount: 150,
        mood: 4,
        createdAt: new Date("2026-06-28T09:00:00Z"), // Morning
      },
      {
        date: "2026-06-29",
        wordCount: 200,
        mood: 5,
        createdAt: new Date("2026-06-29T14:30:00Z"), // Afternoon
      },
      {
        date: "2026-06-30",
        wordCount: 50,
        mood: 2,
        createdAt: new Date("2026-06-30T20:15:00Z"), // Evening
      },
      // Gap on July 1st
      {
        date: "2026-07-02",
        wordCount: 300,
        mood: 5,
        createdAt: new Date("2026-07-02T23:45:00Z"), // Night (local timezone offset will adjust this)
      },
    ];

    const mockFindChain = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockEntries),
    };
    vi.mocked(EntryModel.find).mockReturnValue(mockFindChain as any);

    // Let's compute with timezoneOffset = 0 (UTC)
    const payload = await InsightsService.getInsights(mockUserId, mockToday, 0);

    // Streak tests:
    // Dates written: 06-28, 06-29, 06-30, [gap 07-01], 07-02.
    // Longest streak: 06-28 to 06-30 is 3 days.
    // Current streak: today (07-02) is written. Yesterday (07-01) is missing. So current streak is 1.
    expect(payload.streaks.longestStreak).toBe(3);
    expect(payload.streaks.currentStreak).toBe(1);

    // Aggregations
    expect(payload.wordCountStats.total).toBe(700);
    expect(payload.wordCountStats.average).toBe(175);
    
    // Mood average: (4 + 5 + 2 + 5) / 4 = 16 / 4 = 4.0
    expect(payload.moodStats.average).toBe(4.0);
    expect(payload.moodStats.distribution[5]).toBe(2);
    expect(payload.moodStats.distribution[2]).toBe(1);
    expect(payload.moodStats.distribution[1]).toBe(0);

    // Heatmap verification
    const dayToday = payload.heatmap.find((d) => d.date === "2026-07-02");
    const dayYesterday = payload.heatmap.find((d) => d.date === "2026-07-01");
    expect(dayToday?.count).toBe(1);
    expect(dayToday?.wordCount).toBe(300);
    expect(dayYesterday?.count).toBe(0);

    // Activity Summaries
    // Time of day categories for UTC:
    // 2026-06-28T09:00:00Z -> Hour 9 -> Morning
    // 2026-06-29T14:30:00Z -> Hour 14 -> Afternoon
    // 2026-06-30T20:15:00Z -> Hour 20 -> Evening
    // 2026-07-02T23:45:00Z -> Hour 23 -> Night
    // All are equal, but let's see which has priority or verify counts
    expect(payload.activitySummaries.mostActiveTimeOfDay?.count).toBe(1);

    // Monthly aggregates
    const juneStats = payload.monthlyOverview["2026-06"];
    expect(juneStats?.entryCount).toBe(3);
    expect(juneStats?.totalWords).toBe(400);
    expect(juneStats?.averageMood).toBe(3.7); // (4+5+2)/3 = 3.6666... -> 3.7
  });

  it("should calculate correct current streak when last written date was yesterday", async () => {
    const mockEntries = [
      { date: "2026-06-30", wordCount: 100, mood: 3, createdAt: new Date() },
      { date: "2026-07-01", wordCount: 120, mood: 4, createdAt: new Date() },
      // Today is 2026-07-02, not written yet
    ];

    const mockFindChain = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockEntries),
    };
    vi.mocked(EntryModel.find).mockReturnValue(mockFindChain as any);

    const payload = await InsightsService.getInsights(mockUserId, mockToday);

    // Streak should include yesterday (07-01) and consecutive days (06-30) -> streak of 2
    expect(payload.streaks.currentStreak).toBe(2);
    expect(payload.streaks.longestStreak).toBe(2);
  });
});
