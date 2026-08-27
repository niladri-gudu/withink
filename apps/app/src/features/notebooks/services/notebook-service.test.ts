import { beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessRuleError } from "@/server/errors";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";

import {
  NotebookRepository,
  type NotebookRecord,
} from "../repositories/notebook-repository";
import {
  DEFAULT_NOTEBOOK_NAME,
  NotebookLimitError,
  NotebooksService,
} from "./notebook-service";

vi.mock("@/features/billing/services/entitlements-service", () => ({
  EntitlementsService: {
    getEntitlements: vi.fn(),
  },
}));

vi.mock("@/features/journal/repositories/entry-repository", () => ({
  EntryRepository: {
    backfillNullNotebooks: vi.fn().mockResolvedValue(0),
    getNotebookUsage: vi.fn().mockResolvedValue(new Map()),
    countByNotebook: vi.fn().mockResolvedValue(0),
    setEntryNotebook: vi.fn().mockResolvedValue(true),
    invalidateUserEntryCache: vi.fn().mockResolvedValue(null),
    bumpUserEntryVersion: vi.fn().mockResolvedValue(2),
  },
}));

vi.mock("../repositories/notebook-repository", () => ({
  NotebookRepository: {
    listByUserId: vi.fn(),
    getById: vi.fn(),
    getDefault: vi.fn(),
    create: vi.fn(),
    setName: vi.fn(),
    setDefault: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGetEntitlements = vi.mocked(EntitlementsService.getEntitlements);
const mockedBackfill = vi.mocked(EntryRepository.backfillNullNotebooks);
const mockedBump = vi.mocked(EntryRepository.bumpUserEntryVersion);
const mockedCountByNotebook = vi.mocked(EntryRepository.countByNotebook);
const mockedSetEntryNotebook = vi.mocked(EntryRepository.setEntryNotebook);
const mockedUsage = vi.mocked(EntryRepository.getNotebookUsage);
const mockedList = vi.mocked(NotebookRepository.listByUserId);
const mockedGetById = vi.mocked(NotebookRepository.getById);
const mockedCreate = vi.mocked(NotebookRepository.create);
const mockedSetName = vi.mocked(NotebookRepository.setName);
const mockedSetDefault = vi.mocked(NotebookRepository.setDefault);
const mockedDelete = vi.mocked(NotebookRepository.delete);

let seq = 0;
function nb(overrides: Partial<NotebookRecord> = {}): NotebookRecord {
  seq += 1;
  return {
    id: `nb-${String(seq).padStart(3, "0")}`,
    userId: "user-1",
    name: `Notebook ${seq}`,
    nameLower: `notebook ${seq}`,
    isDefault: false,
    createdAt: new Date(Date.UTC(2026, 0, seq)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 0, seq)).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default mock behavior reset (clearAllMocks wipes implementations set
  // via mockResolvedValue in factories).
  mockedBackfill.mockResolvedValue(0);
  mockedCountByNotebook.mockResolvedValue(0);
  mockedSetEntryNotebook.mockResolvedValue(true);
  mockedUsage.mockResolvedValue(new Map());
});

describe("NotebooksService.ensureBootstrapped", () => {
  it("creates the default notebook and files legacy entries on first read", async () => {
    const created = nb({ name: DEFAULT_NOTEBOOK_NAME, isDefault: true });
    mockedList.mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    mockedCreate.mockResolvedValue(created);
    mockedBackfill.mockResolvedValue(4);

    await NotebooksService.ensureBootstrapped("user-1");

    expect(mockedCreate).toHaveBeenCalledWith(
      "user-1",
      DEFAULT_NOTEBOOK_NAME,
      true,
    );
    expect(mockedBackfill).toHaveBeenCalledWith("user-1", created.id);
    // Render-safe bump (no revalidateTag) — filing changes no insights data.
    expect(mockedBump).toHaveBeenCalledWith("user-1");
  });

  it("is a no-op create-wise when notebooks already exist", async () => {
    const existing = [
      nb({ name: "Journal", isDefault: true }),
      nb({ name: "Work" }),
    ];
    mockedList.mockResolvedValue(existing);

    await NotebooksService.ensureBootstrapped("user-1");

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedBump).not.toHaveBeenCalled();
  });

  it("promotes the oldest survivor when no default flag exists", async () => {
    const oldest = nb({ name: "Journal", isDefault: false });
    mockedList.mockResolvedValue([oldest, nb()]);

    await NotebooksService.ensureBootstrapped("user-1");

    expect(mockedSetDefault).toHaveBeenCalledWith("user-1", oldest.id);
  });

  it("swallows a lost bootstrap race and reuses the winner's row", async () => {
    const winnersRow = nb({ name: DEFAULT_NOTEBOOK_NAME, isDefault: true });
    mockedList.mockResolvedValueOnce([]).mockResolvedValueOnce([winnersRow]);
    mockedCreate.mockRejectedValue(new Error("E11000 duplicate key"));

    await expect(
      NotebooksService.ensureBootstrapped("user-1"),
    ).resolves.toBeUndefined();

    expect(mockedBackfill).toHaveBeenCalledWith("user-1", winnersRow.id);
  });
});

describe("NotebooksService.listNotebooks", () => {
  it("maps usage stats onto summaries", async () => {
    const journal = nb({ name: "Journal", isDefault: true });
    const work = nb({ name: "Work" });
    mockedList.mockResolvedValue([journal, work]);
    mockedUsage.mockResolvedValue(
      new Map([
        [journal.id, { count: 12, lastWrittenAt: "2026-08-20T00:00:00Z" }],
        [work.id, { count: 2, lastWrittenAt: null }],
      ]),
    );

    const result = await NotebooksService.listNotebooks("user-1");

    expect(result).toEqual([
      {
        id: journal.id,
        name: "Journal",
        isDefault: true,
        entryCount: 12,
        lastWrittenAt: "2026-08-20T00:00:00Z",
      },
      {
        id: work.id,
        name: "Work",
        isDefault: false,
        entryCount: 2,
        lastWrittenAt: null,
      },
    ]);
  });

  it("lists over-limit grandfathered notebooks untouched (downgrade)", async () => {
    // A lapsed Plus member with more notebooks than Free allows still sees
    // every one of them — only creation is gated.
    const many = Array.from({ length: 8 }, (_, i) =>
      nb({ isDefault: i === 0 }),
    );
    mockedList.mockResolvedValue(many);

    const result = await NotebooksService.listNotebooks("user-1");

    expect(result).toHaveLength(8);
  });
});

describe("NotebooksService.createNotebook", () => {
  it.each([
    ["free", 1],
    ["plus", 3],
    ["pro", 10],
  ])(
    "throws NotebookLimitError for %s at its cap (%i)",
    async (plan, limit) => {
      mockedList
        .mockResolvedValueOnce([nb()])
        .mockResolvedValueOnce(
          Array.from({ length: limit }, (_, i) => nb({ isDefault: i === 0 })),
        );
      mockedGetEntitlements.mockResolvedValue({
        plan,
        notebookLimit: limit,
      } as never);

      await expect(
        NotebooksService.createNotebook("user-1", "New One"),
      ).rejects.toBeInstanceOf(NotebookLimitError);
    },
  );

  it("creates under the limit with normalized whitespace-collapsed name", async () => {
    const journal = nb({ name: "Journal", isDefault: true });
    mockedList.mockResolvedValue([journal]);
    mockedGetEntitlements.mockResolvedValue({
      plan: "plus",
      notebookLimit: 3,
    } as never);
    const created = nb({ name: "Night Thoughts" });
    mockedCreate.mockResolvedValue(created);

    const result = await NotebooksService.createNotebook(
      "user-1",
      "  Night   Thoughts ",
    );

    expect(mockedCreate).toHaveBeenCalledWith(
      "user-1",
      "Night Thoughts",
      false,
    );
    expect(result).toMatchObject({
      id: created.id,
      name: "Night Thoughts",
      entryCount: 0,
    });
  });

  it("rejects duplicate names case-insensitively", async () => {
    mockedList.mockResolvedValue([
      nb({ name: "Journal", isDefault: true }),
      nb({ name: "Work" }),
    ]);
    mockedGetEntitlements.mockResolvedValue({
      plan: "pro",
      notebookLimit: 10,
    } as never);

    await expect(
      NotebooksService.createNotebook("user-1", "  WORK  "),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe("NotebooksService.renameNotebook", () => {
  it("renames an owned notebook", async () => {
    const target = nb({ name: "Work" });
    mockedGetById.mockResolvedValue(target);
    mockedList.mockResolvedValue([target]);

    await NotebooksService.renameNotebook("user-1", target.id, "Deep Work");

    expect(mockedSetName).toHaveBeenCalledWith(
      "user-1",
      target.id,
      "Deep Work",
    );
  });

  it("rejects renaming into an existing sibling's name", async () => {
    const journal = nb({ name: "Journal", isDefault: true });
    const work = nb({ name: "Work" });
    mockedGetById.mockResolvedValue(work);
    mockedList.mockResolvedValue([journal, work]);

    await expect(
      NotebooksService.renameNotebook("user-1", work.id, "JOURNAL"),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(mockedSetName).not.toHaveBeenCalled();
  });

  it("rejects unknown notebook ids", async () => {
    mockedGetById.mockResolvedValue(null);

    await expect(
      NotebooksService.renameNotebook("user-1", "missing", "X"),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe("NotebooksService.deleteNotebook", () => {
  it("refuses to delete a notebook that still holds entries", async () => {
    const target = nb();
    mockedGetById.mockResolvedValue(target);
    mockedCountByNotebook.mockResolvedValue(3);

    await expect(
      NotebooksService.deleteNotebook("user-1", target.id),
    ).rejects.toThrow(/Move them to another notebook first/);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("deletes an empty notebook and promotes the oldest survivor", async () => {
    const def = nb({ name: "Journal", isDefault: true });
    const survivor = nb({ name: "Work" });
    mockedGetById.mockResolvedValue(def);
    mockedList.mockResolvedValue([survivor]);

    await NotebooksService.deleteNotebook("user-1", def.id);

    expect(mockedDelete).toHaveBeenCalledWith("user-1", def.id);
    expect(mockedSetDefault).toHaveBeenCalledWith("user-1", survivor.id);
  });

  it("deletes an empty non-default without touching defaults", async () => {
    const plain = nb({ name: "Scratch" });
    mockedGetById.mockResolvedValue(plain);
    mockedList.mockResolvedValue([plain]);

    await NotebooksService.deleteNotebook("user-1", plain.id);

    expect(mockedSetDefault).not.toHaveBeenCalled();
  });
});

describe("NotebooksService.moveEntryToNotebook", () => {
  const validDate = "2026-08-26";

  it("moves an owned entry into an owned notebook", async () => {
    const target = nb();
    mockedGetById.mockResolvedValue(target);

    await NotebooksService.moveEntryToNotebook("user-1", validDate, target.id);

    expect(mockedSetEntryNotebook).toHaveBeenCalledWith(
      "user-1",
      validDate,
      target.id,
    );
  });

  it("validates the date shape before querying", async () => {
    await expect(
      NotebooksService.moveEntryToNotebook("user-1", "not-a-date", "x"),
    ).rejects.toBeInstanceOf(Error);
    expect(mockedGetById).not.toHaveBeenCalled();
  });

  it("rejects unknown target notebooks", async () => {
    mockedGetById.mockResolvedValue(null);

    await expect(
      NotebooksService.moveEntryToNotebook("user-1", validDate, "missing"),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(mockedSetEntryNotebook).not.toHaveBeenCalled();
  });

  it("reports when no entry exists on that date", async () => {
    const target = nb();
    mockedGetById.mockResolvedValue(target);
    mockedSetEntryNotebook.mockResolvedValue(false);

    await expect(
      NotebooksService.moveEntryToNotebook("user-1", validDate, target.id),
    ).rejects.toThrow(/No entry exists/);
  });
});
