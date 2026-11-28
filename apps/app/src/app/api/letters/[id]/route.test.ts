import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteLetterAction,
  getLetterForComposeAction,
} from "@/features/letters/actions/letter-actions";

import type * as apiLib from "../../_lib";
import { DELETE, GET } from "./route";

vi.mock("../../_lib", async (importOriginal) => {
  const actual = await importOriginal<typeof apiLib>();
  return {
    ...actual,
    requireApiSession: vi.fn(async () => ({ userId: "user-1" })),
  };
});

vi.mock("@/features/letters/actions/letter-actions", () => ({
  deleteLetterAction: vi.fn(),
  getLetterForComposeAction: vi.fn(),
}));

const id = "0123456789abcdef01234567";

const letter = {
  id,
  unlockDate: "2030-01-01",
  title: "aa:bb",
  wordCount: 3,
  sealed: true,
  readAt: null,
  createdAt: "2026-11-26T09:00:00.000Z",
  updatedAt: "2026-11-26T09:00:00.000Z",
  contentHtml: "cc:dd",
  contentText: "ee:ff",
  contentJson: {},
};

const context = { params: Promise.resolve({ id }) };

describe("/api/letters/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLetterForComposeAction).mockResolvedValue({
      success: true,
      data: letter,
      today: "2026-11-26",
    });
    vi.mocked(deleteLetterAction).mockResolvedValue({ success: true });
  });

  it("returns the full letter and viewer-local today", async () => {
    const res = await GET(
      new Request(`http://localhost/api/letters/${id}`),
      context,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ letter, today: "2026-11-26" });
  });

  it("maps a resting letter to the shared LETTER_SEALED code", async () => {
    vi.mocked(getLetterForComposeAction).mockResolvedValue({
      success: false,
      error: "This letter isn't ready to open yet.",
      code: "LETTER_SEALED",
    });

    const res = await GET(
      new Request(`http://localhost/api/letters/${id}`),
      context,
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "LETTER_SEALED" });
  });

  it("rejects an invalid id without calling the action", async () => {
    const res = await GET(new Request("http://localhost/api/letters/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });

    expect(res.status).toBe(400);
    expect(getLetterForComposeAction).not.toHaveBeenCalled();
  });

  it("deletes the letter", async () => {
    const res = await DELETE(
      new Request(`http://localhost/api/letters/${id}`, { method: "DELETE" }),
      context,
    );

    expect(res.status).toBe(200);
    expect(deleteLetterAction).toHaveBeenCalledWith(id);
  });
});
