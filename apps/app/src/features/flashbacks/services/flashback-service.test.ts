import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCachedValue, redis, setCachedValue } from "@/lib/redis";

import { JournalService } from "../../journal/services/journal-service";
import { FlashbackService } from "./flashback-service";

// Mock redis client and helpers
vi.mock("@/lib/redis", () => ({
  getCachedValue: vi.fn(),
  setCachedValue: vi.fn(),
  redis: {
    del: vi.fn(),
  },
}));

// Mock JournalService
vi.mock("../../journal/services/journal-service", () => ({
  JournalService: {
    getEntryDates: vi.fn(),
    getEntryForDate: vi.fn(),
  },
}));

describe("FlashbackService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-123";
  const mockToday = "2026-07-02";

  it("should return null if user has no entries", async () => {
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([]);

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).toBeNull();
  });

  it("should return null if entries are only today or yesterday", async () => {
    // Today is 2026-07-02, yesterday is 2026-07-01. Older entries are required for flashbacks.
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([
      "2026-07-02",
      "2026-07-01",
    ]);

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).toBeNull();
  });

  it("should prioritize exactly 1 year ago anniversary when available", async () => {
    // 1 year ago is 2025-07-02
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([
      "2026-07-01",
      "2025-07-02", // 1 year anniversary
      "2025-05-15",
    ]);

    const mockEntry = {
      id: "entry-1yr",
      userId: mockUserId,
      date: "2025-07-02",
      title: "One Year Ago Reflection",
      contentText: "Writing this one year ago.",
      contentHtml: "<p>Writing this one year ago.</p>",
      contentJson: {},
      wordCount: 5,
      mood: 4,
      notebookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(JournalService.getEntryForDate).mockResolvedValue(mockEntry);
    vi.mocked(getCachedValue).mockResolvedValue(null); // cache miss

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).not.toBeNull();
    expect(result?.entry?.id).toBe("entry-1yr");
    expect(result?.label).toBe("Exactly one year ago today");
    expect(setCachedValue).toHaveBeenCalledWith(
      expect.stringContaining("flashback:2026-07-02"),
      { entryDate: "2025-07-02", label: "Exactly one year ago today" },
      86400,
    );
  });

  it("should pick a past anniversary (e.g. 2 years ago) when 1 year ago is not available", async () => {
    // 2 years ago is 2024-07-02
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([
      "2026-07-01",
      "2024-07-02", // 2 years anniversary
      "2023-07-02", // 3 years anniversary
    ]);

    const mockEntry = {
      id: "entry-2yr",
      userId: mockUserId,
      date: "2024-07-02",
      title: "Two Years Ago Reflection",
      contentText: "Writing this two years ago.",
      contentHtml: "<p>Writing this two years ago.</p>",
      contentJson: {},
      wordCount: 5,
      mood: 3,
      notebookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(JournalService.getEntryForDate).mockResolvedValue(mockEntry);
    vi.mocked(getCachedValue).mockResolvedValue(null);

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).not.toBeNull();
    expect(result?.entry?.id).toBe("entry-2yr");
    expect(result?.label).toBe("Exactly 2 years ago today");
  });

  it("should fall back to a random past entry if no anniversary is available", async () => {
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([
      "2026-07-02",
      "2026-07-01",
      "2026-05-15", // Eligible past entry, not an anniversary
    ]);

    const mockEntry = {
      id: "entry-random",
      userId: mockUserId,
      date: "2026-05-15",
      title: "Random Spring Reflection",
      contentText: "Writing in the spring.",
      contentHtml: "<p>Writing in the spring.</p>",
      contentJson: {},
      wordCount: 4,
      mood: 5,
      notebookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(JournalService.getEntryForDate).mockResolvedValue(mockEntry);
    vi.mocked(getCachedValue).mockResolvedValue(null);

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).not.toBeNull();
    expect(result?.entry?.id).toBe("entry-random");
    expect(result?.label).toBe("A reflection from your archives");
  });

  it("should avoid recently shown entries by checking history", async () => {
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([
      "2026-07-02",
      "2026-07-01",
      "2026-05-15", // shown recently
      "2026-05-14", // shown recently
      "2026-05-13", // NOT shown recently -> must be picked!
    ]);

    const mockEntry = {
      id: "entry-13th",
      userId: mockUserId,
      date: "2026-05-13",
      title: "May 13 Reflection",
      contentText: "Text here",
      contentHtml: "<p>Text here</p>",
      contentJson: {},
      wordCount: 2,
      mood: 3,
      notebookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(JournalService.getEntryForDate).mockResolvedValue(mockEntry);

    // Mock history containing 05-15 and 05-14
    vi.mocked(getCachedValue).mockImplementation(async (key) => {
      if (key.includes("flashback-history")) {
        return ["2026-05-15", "2026-05-14"];
      }
      return null;
    });

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).not.toBeNull();
    expect(result?.entry?.date).toBe("2026-05-13");
    expect(setCachedValue).toHaveBeenCalledWith(
      expect.stringContaining("flashback-history"),
      expect.arrayContaining(["2026-05-13", "2026-05-15", "2026-05-14"]),
      2592000,
    );
  });

  it("should return cached flashback on subsequent calls", async () => {
    const mockEntry = {
      id: "entry-cached",
      userId: mockUserId,
      date: "2026-05-15",
      title: "Cached Reflection",
      contentText: "Text",
      contentHtml: "<p>Text</p>",
      contentJson: {},
      wordCount: 1,
      mood: 4,
      notebookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock that we have a cached flashback choice for today
    vi.mocked(getCachedValue).mockImplementation(async (key) => {
      if (key.includes("flashback:2026-07-02")) {
        return {
          entryDate: "2026-05-15",
          label: "A reflection from your archives",
        };
      }
      return null;
    });

    vi.mocked(JournalService.getEntryForDate).mockResolvedValue(mockEntry);

    const result = await FlashbackService.getFlashbackForToday(
      mockUserId,
      mockToday,
    );

    expect(result).not.toBeNull();
    expect(result?.entry?.id).toBe("entry-cached");
    expect(result?.label).toBe("A reflection from your archives");
    // Verify we didn't perform a new selection or write to cache
    expect(JournalService.getEntryDates).not.toHaveBeenCalled();
    expect(setCachedValue).not.toHaveBeenCalled();
  });

  it("should invalidate cache and select a new flashback on refresh", async () => {
    vi.mocked(JournalService.getEntryDates).mockResolvedValue([
      "2026-07-01",
      "2026-05-15",
      "2026-05-14",
    ]);

    const mockEntry = {
      id: "entry-new-refresh",
      userId: mockUserId,
      date: "2026-05-14",
      title: "Refresh Reflection",
      contentText: "Refreshed text",
      contentHtml: "<p>Refreshed text</p>",
      contentJson: {},
      wordCount: 2,
      mood: 5,
      notebookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(JournalService.getEntryForDate).mockResolvedValue(mockEntry);
    vi.mocked(getCachedValue).mockResolvedValue(null);

    const result = await FlashbackService.refreshFlashback(
      mockUserId,
      mockToday,
    );

    expect(redis!.del).toHaveBeenCalledWith(
      expect.stringContaining("flashback:2026-07-02"),
    );
    expect(result).not.toBeNull();
    expect(result?.entry?.id).toBe("entry-new-refresh");
  });
});
