import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the repository layer — service rules are under test, not persistence.
vi.mock("../repositories/entry-repository", () => ({
  EntryRepository: {
    getEntry: vi.fn(),
    saveEntry: vi.fn(),
  },
}));

import { EntryRepository } from "../repositories/entry-repository";
import { JournalService } from "./journal-service";

import { BusinessRuleError } from "@/server/errors";

const mockedGetEntry = vi.mocked(EntryRepository.getEntry);
const mockedSaveEntry = vi.mocked(EntryRepository.saveEntry);

const TODAY = "2026-08-25";

/** Builds a repository-shaped entry document (cast past Mongoose generics). */
const makeEntryDoc = (overrides: Record<string, unknown> = {}): never =>
  ({
    _id: "entry-1",
    userId: "user-1",
    date: TODAY,
    title: "",
    contentHtml: "",
    contentText: "",
    contentJson: "",
    wordCount: 0,
    mood: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as never;

describe("JournalService.saveJournalEntry writing window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetEntry.mockResolvedValue(null);
    mockedSaveEntry.mockResolvedValue(makeEntryDoc());
  });

  it("allows writing today", async () => {
    const result = await JournalService.saveJournalEntry(
      "user-1",
      TODAY,
      { title: "Today" },
      TODAY,
      { backfillDays: 14 },
    );
    expect(result.date).toBe(TODAY);
  });

  it("applies the legacy 1-day rule when no options are passed", async () => {
    await expect(
      JournalService.saveJournalEntry("user-1", "2026-08-23", {}, TODAY),
    ).rejects.toThrow(BusinessRuleError);
    await expect(
      JournalService.saveJournalEntry("user-1", "2026-08-24", {}, TODAY),
    ).resolves.toBeDefined();
  });

  it("honors a 14-day free-tier window at the boundary", async () => {
    // 2026-08-11 is exactly 14 days before 2026-08-25 (inclusive boundary).
    await expect(
      JournalService.saveJournalEntry("user-1", "2026-08-11", {}, TODAY, {
        backfillDays: 14,
      }),
    ).resolves.toBeDefined();

    await expect(
      JournalService.saveJournalEntry("user-1", "2026-08-10", {}, TODAY, {
        backfillDays: 14,
      }),
    ).rejects.toThrow(/writing window/);
  });

  it("never blocks creation when the window is unlimited (Pro)", async () => {
    const result = await JournalService.saveJournalEntry(
      "user-1",
      "2015-03-02",
      {},
      TODAY,
      { backfillDays: Number.POSITIVE_INFINITY },
    );
    expect(mockedSaveEntry).toHaveBeenCalledWith(
      "user-1",
      "2015-03-02",
      expect.anything(),
      TODAY,
    );
    expect(result).toBeDefined();
  });

  it("always allows editing an existing entry regardless of its age", async () => {
    mockedGetEntry.mockResolvedValue(makeEntryDoc({ date: "2019-01-01" }));

    const result = await JournalService.saveJournalEntry(
      "user-1",
      "2019-01-01",
      { title: "Rewritten" },
      TODAY,
      { backfillDays: 14 },
    );
    expect(result.title).toBe("");
    expect(mockedSaveEntry).toHaveBeenCalledOnce();
  });

  it("still rejects future dates on every plan", async () => {
    for (const backfillDays of [14, Number.POSITIVE_INFINITY]) {
      await expect(
        JournalService.saveJournalEntry("user-1", "2026-12-31", {}, TODAY, {
          backfillDays,
        }),
      ).rejects.toThrow(/future/i);
    }
  });

  it("treats negative windows as today-only", async () => {
    await expect(
      JournalService.saveJournalEntry("user-1", "2026-08-24", {}, TODAY, {
        backfillDays: -5,
      }),
    ).rejects.toThrow(/writing window/);
  });
});
