import { describe, it, expect, vi, beforeEach } from "vitest";
import { JournalService } from "./journal-service";
import { EntryRepository } from "../repositories/entry-repository";
import type { IEntry } from "../repositories/entry-model";

vi.mock("../repositories/entry-repository", () => ({
  EntryRepository: {
    getEntriesPage: vi.fn(),
  },
}));

describe("JournalService Search tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEntries = [
    {
      _id: "1",
      userId: "user1",
      date: "2026-07-02",
      title: "Walk in the Garden",
      contentText: "Today I saw a beautiful monarch butterfly and some roses.",
      contentHtml: "Today I saw a beautiful monarch butterfly and some roses.",
      contentJson: "",
      wordCount: 10,
      mood: 4,
      createdAt: new Date("2026-07-02T10:00:00Z"),
      updatedAt: new Date("2026-07-02T10:00:00Z"),
    },
    {
      _id: "2",
      userId: "user1",
      date: "2026-07-01",
      title: "Quiet Rainy Afternoon",
      contentText: "It has been raining all day. I read a book on philosophy.",
      contentHtml: "It has been raining all day. I read a book on philosophy.",
      contentJson: "",
      wordCount: 12,
      mood: 3,
      createdAt: new Date("2026-07-01T14:00:00Z"),
      updatedAt: new Date("2026-07-01T14:00:00Z"),
    },
    {
      _id: "3",
      userId: "user1",
      date: "2026-06-30",
      title: "Productive Tuesday",
      contentText: "Finished implementing features and went for a run.",
      contentHtml: "Finished implementing features and went for a run.",
      contentJson: "",
      wordCount: 8,
      mood: 5,
      createdAt: new Date("2026-06-30T09:00:00Z"),
      updatedAt: new Date("2026-06-30T09:00:00Z"),
    },
  ];

  it("should return normal paginated entries when no search filter is active", async () => {
    vi.mocked(EntryRepository.getEntriesPage).mockResolvedValue({
      entries: (mockEntries.slice(0, 2) as unknown) as IEntry[],
      total: 3,
    });

    const result = await JournalService.getEntriesPage("user1", 1, 2);

    expect(EntryRepository.getEntriesPage).toHaveBeenCalledWith("user1", 1, 2, undefined);
    expect(result.entries).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.entries[0]?.title).toBe("Walk in the Garden");
  });

  it("should match by title (case-insensitive)", async () => {
    vi.mocked(EntryRepository.getEntriesPage).mockResolvedValue({
      entries: (mockEntries as unknown) as IEntry[],
      total: 3,
    });

    const result = await JournalService.getEntriesPage("user1", 1, 10, {
      search: "rainy",
    });

    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.entries[0]?.title).toBe("Quiet Rainy Afternoon");
  });

  it("should match by decrypted contentText (case-insensitive)", async () => {
    vi.mocked(EntryRepository.getEntriesPage).mockResolvedValue({
      entries: (mockEntries as unknown) as IEntry[],
      total: 3,
    });

    const result = await JournalService.getEntriesPage("user1", 1, 10, {
      search: "butterfly",
    });

    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.entries[0]?.title).toBe("Walk in the Garden");
  });

  it("should match by ISO date string", async () => {
    vi.mocked(EntryRepository.getEntriesPage).mockResolvedValue({
      entries: (mockEntries as unknown) as IEntry[],
      total: 3,
    });

    const result = await JournalService.getEntriesPage("user1", 1, 10, {
      search: "2026-06-30",
    });

    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.entries[0]?.title).toBe("Productive Tuesday");
  });

  it("should match by formatted date string (long/short representation)", async () => {
    vi.mocked(EntryRepository.getEntriesPage).mockResolvedValue({
      entries: (mockEntries as unknown) as IEntry[],
      total: 3,
    });

    // "Jul 1" matches 2026-07-01
    const result1 = await JournalService.getEntriesPage("user1", 1, 10, {
      search: "Jul 1",
    });
    expect(result1.entries).toHaveLength(1);
    expect(result1.entries[0]?.title).toBe("Quiet Rainy Afternoon");

    // "June" matches 2026-06-30
    const result2 = await JournalService.getEntriesPage("user1", 1, 10, {
      search: "June",
    });
    expect(result2.entries).toHaveLength(1);
    expect(result2.entries[0]?.title).toBe("Productive Tuesday");
  });

  it("should slice results correctly based on page and limit in memory", async () => {
    vi.mocked(EntryRepository.getEntriesPage).mockResolvedValue({
      entries: (mockEntries as unknown) as IEntry[],
      total: 3,
    });

    // Search query that matches everything (e.g. "a" or "e")
    const result = await JournalService.getEntriesPage("user1", 2, 1, {
      search: "e",
    });

    expect(result.entries).toHaveLength(1);
    // Page 2, Limit 1 should return the second matching item (Quiet Rainy Afternoon)
    expect(result.entries[0]?.title).toBe("Quiet Rainy Afternoon");
    expect(result.total).toBe(3); // All 3 contain "e"
  });
});
