/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEntryAction,
  saveEntryAction,
  getEntriesListAction,
  getStreakAndStatsAction,
  getEntryDatesAction,
  deleteEntryAction,
} from "./entry-actions";
import { auth } from "@/lib/auth";
import { JournalService } from "../services/journal-service";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

// Mock LockService
vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: {
    isSessionUnlocked: vi.fn().mockResolvedValue(true),
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock JournalService
vi.mock("../services/journal-service", () => ({
  JournalService: {
    getEntryForDate: vi.fn(),
    saveJournalEntry: vi.fn(),
    getEntriesPage: vi.fn(),
    getEntryDates: vi.fn(),
    getEntryStats: vi.fn(),
    deleteEntry: vi.fn(),
  },
}));

describe("entry-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-123";
  const mockSession = {
    user: {
      id: mockUserId,
    },
  };

  describe("unauthorized checks", () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
    });

    it("should fail getEntryAction if unauthorized", async () => {
      const res = await getEntryAction("2026-07-06", "2026-07-06");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail saveEntryAction if unauthorized", async () => {
      const res = await saveEntryAction({}, "2026-07-06");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail getEntriesListAction if unauthorized", async () => {
      const res = await getEntriesListAction(1, 10);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail getStreakAndStatsAction if unauthorized", async () => {
      const res = await getStreakAndStatsAction("2026-07-06");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail getEntryDatesAction if unauthorized", async () => {
      const res = await getEntryDatesAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail deleteEntryAction if unauthorized", async () => {
      const res = await deleteEntryAction("2026-07-06");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });
  });

  describe("authorized behavior", () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    });

    it("should call getEntryForDate on getEntryAction", async () => {
      vi.mocked(JournalService.getEntryForDate).mockResolvedValue({ id: "entry-1" } as any);
      const res = await getEntryAction("2026-07-06", "2026-07-06");
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ id: "entry-1" });
      expect(JournalService.getEntryForDate).toHaveBeenCalledWith(mockUserId, "2026-07-06", "2026-07-06");
    });

    it("should validate and save entry on saveEntryAction", async () => {
      const input = {
        date: "2026-07-06",
        title: "Test Entry",
        mood: 4,
        contentHtml: "<p>Hello</p>",
        contentText: "Hello",
        contentJson: '{"type":"doc"}',
      };
      vi.mocked(JournalService.saveJournalEntry).mockResolvedValue({ id: "saved-1", ...input } as any);

      const res = await saveEntryAction(input, "2026-07-06");
      expect(res.success).toBe(true);
      expect(res.data?.id).toBe("saved-1");
      expect(JournalService.saveJournalEntry).toHaveBeenCalledWith(
        mockUserId,
        "2026-07-06",
        expect.any(Object),
        "2026-07-06"
      );
    });

    it("should return validation error on saveEntryAction if input is invalid", async () => {
      const invalidInput = {
        date: "invalid-date", // invalid date format
        title: "T", // too short title
        mood: 10, // invalid mood
      };

      const res = await saveEntryAction(invalidInput, "2026-07-06");
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(JournalService.saveJournalEntry).not.toHaveBeenCalled();
    });

    it("should return list of entries on getEntriesListAction", async () => {
      vi.mocked(JournalService.getEntriesPage).mockResolvedValue({ entries: [], total: 0 });
      const res = await getEntriesListAction(1, 10, { search: "query" });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ entries: [], total: 0 });
      expect(JournalService.getEntriesPage).toHaveBeenCalledWith(mockUserId, 1, 10, { search: "query" });
    });

    it("should compute streaks correctly in getStreakAndStatsAction when dates list is empty", async () => {
      vi.mocked(JournalService.getEntryDates).mockResolvedValue([]);
      vi.mocked(JournalService.getEntryStats).mockResolvedValue({ totalEntries: 0, totalWords: 100, averageWords: 50 });

      const res = await getStreakAndStatsAction("2026-07-06");
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        currentStreak: 0,
        totalEntries: 0,
        totalWords: 100,
        averageWords: 50,
      });
    });

    it("should compute streaks correctly in getStreakAndStatsAction when streak is active", async () => {
      vi.mocked(JournalService.getEntryDates).mockResolvedValue(["2026-07-06", "2026-07-05", "2026-07-04"]);
      vi.mocked(JournalService.getEntryStats).mockResolvedValue({ totalEntries: 3, totalWords: 150, averageWords: 50 });

      const res = await getStreakAndStatsAction("2026-07-06");
      expect(res.success).toBe(true);
      expect(res.data?.currentStreak).toBe(3);
      expect(res.data?.totalEntries).toBe(3);
    });

    it("should compute streak of 0 if last entry was before yesterday", async () => {
      vi.mocked(JournalService.getEntryDates).mockResolvedValue(["2026-07-04", "2026-07-03"]);
      vi.mocked(JournalService.getEntryStats).mockResolvedValue({ totalEntries: 2, totalWords: 100, averageWords: 50 });

      const res = await getStreakAndStatsAction("2026-07-06");
      expect(res.success).toBe(true);
      expect(res.data?.currentStreak).toBe(0);
      expect(res.data?.totalEntries).toBe(2);
    });

    it("should retrieve dates list on getEntryDatesAction", async () => {
      vi.mocked(JournalService.getEntryDates).mockResolvedValue(["2026-07-06"]);
      const res = await getEntryDatesAction();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(["2026-07-06"]);
      expect(JournalService.getEntryDates).toHaveBeenCalledWith(mockUserId);
    });

    it("should call deleteEntry on deleteEntryAction", async () => {
      vi.mocked(JournalService.deleteEntry).mockResolvedValue(true);
      const res = await deleteEntryAction("2026-07-06");
      expect(res.success).toBe(true);
      expect(res.data).toBe(true);
      expect(JournalService.deleteEntry).toHaveBeenCalledWith(mockUserId, "2026-07-06");
    });
  });
});
