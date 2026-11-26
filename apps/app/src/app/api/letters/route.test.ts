import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  listLettersAction,
  upsertLetterAction,
} from "@/features/letters/actions/letter-actions";

import type * as apiLib from "../_lib";
import { GET, POST } from "./route";

vi.mock("../_lib", async (importOriginal) => {
  const actual = await importOriginal<typeof apiLib>();
  return {
    ...actual,
    requireApiSession: vi.fn(async () => ({ userId: "user-1" })),
  };
});

vi.mock("@/features/letters/actions/letter-actions", () => ({
  listLettersAction: vi.fn(),
  upsertLetterAction: vi.fn(),
}));

const letter = {
  id: "0123456789abcdef01234567",
  unlockDate: "2030-01-01",
  title: "aa:bb",
  wordCount: 3,
  sealed: false,
  readAt: null,
  createdAt: "2026-11-26T09:00:00.000Z",
  updatedAt: "2026-11-26T09:00:00.000Z",
  contentHtml: "cc:dd",
  contentText: "ee:ff",
  contentJson: {},
};

function post(body: unknown): Request {
  return new Request("http://localhost/api/letters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/letters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLettersAction).mockResolvedValue({
      success: true,
      data: [letter],
      today: "2026-11-26",
    });
    vi.mocked(upsertLetterAction).mockResolvedValue({
      success: true,
      data: letter,
    });
  });

  it("returns the shelf and viewer-local today", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      letters: [letter],
      today: "2026-11-26",
    });
  });

  it("rejects an invalid save without calling the action", async () => {
    const res = await POST(post({ unlockDate: "2030-1-1" }) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_REQUEST" });
    expect(upsertLetterAction).not.toHaveBeenCalled();
  });

  it("applies defaults and saves a valid draft", async () => {
    const res = await POST(post({ unlockDate: "2030-01-01" }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(letter);
    expect(upsertLetterAction).toHaveBeenCalledWith({
      unlockDate: "2030-01-01",
      sealed: false,
      title: "",
      contentHtml: "",
      contentText: "",
    });
  });

  it("maps a plan-limit rejection onto its code", async () => {
    vi.mocked(upsertLetterAction).mockResolvedValue({
      success: false,
      error: "You're holding every letter this plan can carry.",
      code: "LETTER_LIMIT_REACHED",
    });
    const res = await POST(post({ unlockDate: "2030-01-01" }) as never);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({
      code: "LETTER_LIMIT_REACHED",
    });
  });
});
