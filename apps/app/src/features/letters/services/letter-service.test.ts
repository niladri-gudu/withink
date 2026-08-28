import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock persistence and billing — service rules are under test.
vi.mock("../repositories/letter-repository", () => ({
  LetterRepository: {
    listMeta: vi.fn(),
    getFullById: vi.fn(),
    createDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteById: vi.fn(),
    countActive: vi.fn(),
    markReadIfUnread: vi.fn(),
    listArrivedUnread: vi.fn(),
    deleteAllForUser: vi.fn(),
  },
}));

vi.mock("@/features/billing/services/entitlements-service", () => ({
  EntitlementsService: {
    getEntitlements: vi.fn(),
  },
}));

import { EntitlementsService } from "@/features/billing/services/entitlements-service";

import { LetterRepository, type LetterFullRecord } from "../repositories/letter-repository";
import {
  LetterFrozenError,
  LetterLimitError,
  LetterSealedError,
  LettersService,
} from "./letter-service";

const mockedGet = vi.mocked(LetterRepository.getFullById);
const mockedCreate = vi.mocked(LetterRepository.createDoc);
const mockedUpdate = vi.mocked(LetterRepository.updateDoc);
const mockedCountActive = vi.mocked(LetterRepository.countActive);
const mockedMarkRead = vi.mocked(LetterRepository.markReadIfUnread);
const mockedEntitlements = vi.mocked(EntitlementsService.getEntitlements);

const TODAY = "2026-08-27";
const FUTURE = "2026-09-01";
const PAST = "2026-08-01";

const makeLetter = (
  overrides: Partial<LetterFullRecord> = {},
): LetterFullRecord =>
  ({
    id: "letter-1",
    unlockDate: FUTURE,
    title: "",
    wordCount: 0,
    sealed: false,
    readAt: null,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    contentHtml: "",
    contentText: "",
    contentJson: {},
    ...overrides,
  }) as LetterFullRecord;

const mockPlanLimit = (limit: number) =>
  mockedEntitlements.mockResolvedValue({
    plan: limit === 0 ? "free" : limit === 3 ? "plus" : "pro",
    futureLetterLimit: limit,
  } as never);

const input = (overrides: Record<string, unknown> = {}) =>
  ({
    unlockDate: FUTURE,
    sealed: false,
    title: "hello",
    contentHtml: "<p>hello</p>",
    contentText: "hello",
    contentJson: {},
    wordCount: 1,
    ...overrides,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockedEntitlements.mockResolvedValue({
    plan: "pro",
    futureLetterLimit: Number.POSITIVE_INFINITY,
  } as never);
});

describe("LettersService.upsertLetter — creation", () => {
  it("creates when capacity exists (Pro skips the count entirely)", async () => {
    mockedCreate.mockResolvedValue(makeLetter());

    await LettersService.upsertLetter("u1", input(), TODAY);

    expect(mockedCountActive).not.toHaveBeenCalled();
    expect(mockedCreate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ unlockDate: FUTURE }),
    );
  });

  it("rejects a past unlock date without touching capacity", async () => {
    await expect(
      LettersService.upsertLetter("u1", input({ unlockDate: PAST }), TODAY),
    ).rejects.toMatchObject({ type: "BUSINESS_RULE" });
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedCountActive).not.toHaveBeenCalled();
  });

  it("enforces the plan slot count on creation", async () => {
    mockPlanLimit(3);
    mockedCountActive.mockResolvedValue(3);

    await expect(
      LettersService.upsertLetter("u1", input(), TODAY),
    ).rejects.toBeInstanceOf(LetterLimitError);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("frees slots when delivered letters exist (delivered ≠ active)", async () => {
    mockPlanLimit(3);
    mockedCountActive.mockResolvedValue(1);
    mockedCreate.mockResolvedValue(makeLetter());

    await LettersService.upsertLetter("u1", input(), TODAY);

    expect(mockedCreate).toHaveBeenCalledOnce();
  });
});

describe("LettersService.upsertLetter — edits (grandfathering)", () => {
  it("never re-asserts capacity while editing an already-active letter", async () => {
    mockedGet.mockResolvedValue(makeLetter());
    mockedUpdate.mockResolvedValue(makeLetter());
    mockPlanLimit(0); // simulated downgrade to Free with an existing letter

    const saved = await LettersService.upsertLetter(
      "u1",
      input({ letterId: "letter-1" }),
      TODAY,
    );

    expect(mockedEntitlements).not.toHaveBeenCalled();
    expect(saved).toBeDefined();
    expect(mockedUpdate).toHaveBeenCalledWith(
      "u1",
      "letter-1",
      expect.objectContaining({ unlockDate: FUTURE }),
    );
  });

  it("freezes delivered letters entirely", async () => {
    mockedGet.mockResolvedValue(makeLetter({ unlockDate: PAST }));

    await expect(
      LettersService.upsertLetter("u1", input({ letterId: "letter-1" }), TODAY),
    ).rejects.toBeInstanceOf(LetterFrozenError);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("freezes delivered letters even against a re-scheduled future date", async () => {
    mockedGet.mockResolvedValue(makeLetter({ unlockDate: PAST }));
    mockPlanLimit(3);

    await expect(
      LettersService.upsertLetter(
        "u1",
        input({ letterId: "letter-1", unlockDate: FUTURE }),
        TODAY,
      ),
    ).rejects.toBeInstanceOf(LetterFrozenError);
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedEntitlements).not.toHaveBeenCalled();
  });

  it("rejects date changes that land on today or the past", async () => {
    mockedGet.mockResolvedValue(makeLetter({ unlockDate: FUTURE }));

    await expect(
      LettersService.upsertLetter(
        "u1",
        input({ letterId: "letter-1", unlockDate: TODAY }),
        TODAY,
      ),
    ).rejects.toMatchObject({ type: "BUSINESS_RULE" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("freezes sealed letters entirely — sealing is the point", async () => {
    mockedGet.mockResolvedValue(makeLetter({ sealed: true }));

    await expect(
      LettersService.upsertLetter(
        "u1",
        input({ letterId: "letter-1" }),
        TODAY,
      ),
    ).rejects.toBeInstanceOf(LetterFrozenError);
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedEntitlements).not.toHaveBeenCalled();
  });
});

describe("LettersService.getLetter — the seal gate", () => {
  it("refuses the body of a sealed letter before its day", async () => {
    mockedGet.mockResolvedValue(makeLetter({ sealed: true }));

    await expect(
      LettersService.getLetter("u1", "letter-1", TODAY),
    ).rejects.toBeInstanceOf(LetterSealedError);
  });

  it("opens a sealed letter's body once the day has arrived", async () => {
    const delivered = makeLetter({
      unlockDate: TODAY,
      sealed: true,
      contentText: "hello, future me",
    });
    mockedGet.mockResolvedValue(delivered);

    const letter = await LettersService.getLetter("u1", "letter-1", TODAY);
    expect(letter.contentText).toBe("hello, future me");
  });

  it("never seals drafts — an unsealed letter's body stays reachable", async () => {
    const draft = makeLetter({ sealed: false });
    mockedGet.mockResolvedValue(draft);

    const letter = await LettersService.getLetter("u1", "letter-1", TODAY);
    expect(letter.id).toBe("letter-1");
  });
});

describe("LettersService.sealLetter", () => {
  it("seals a future-dated letter", async () => {
    mockedGet.mockResolvedValue(makeLetter());
    mockedUpdate.mockResolvedValue(makeLetter({ sealed: true }));

    const sealed = await LettersService.sealLetter("u1", "letter-1", TODAY);

    expect(sealed.sealed).toBe(true);
    expect(mockedUpdate).toHaveBeenCalledWith(
      "u1",
      "letter-1",
      expect.objectContaining({ sealed: true }),
    );
  });

  it("refuses to seal after the day has arrived", async () => {
    mockedGet.mockResolvedValue(makeLetter({ unlockDate: PAST }));

    await expect(
      LettersService.sealLetter("u1", "letter-1", TODAY),
    ).rejects.toBeInstanceOf(LetterFrozenError);
  });
});

describe("LettersService.revealLetter", () => {
  it("throws the sealed code while the unlock date is in the future", async () => {
    mockedGet.mockResolvedValue(makeLetter({ sealed: true }));

    await expect(
      LettersService.revealLetter("u1", "letter-1", TODAY),
    ).rejects.toBeInstanceOf(LetterSealedError);
    expect(mockedMarkRead).not.toHaveBeenCalled();
  });

  it("stamps readAt once and opens on and after the unlock date", async () => {
    mockedGet.mockResolvedValue(
      makeLetter({ unlockDate: TODAY, sealed: true }),
    );

    const revealed = await LettersService.revealLetter(
      "u1",
      "letter-1",
      TODAY,
    );

    expect(mockedMarkRead).toHaveBeenCalledWith("u1", "letter-1");
    expect(revealed.contentText).toBe("");
  });
});

describe("LettersService edge cases", () => {
  it("404s unknown or foreign letters on every owned lookup", async () => {
    mockedGet.mockResolvedValue(null);

    await expect(
      LettersService.getLetter("u1", "missing", TODAY),
    ).rejects.toMatchObject({ type: "VALIDATION" });
  });
});
