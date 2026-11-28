import { describe, expect, it } from "vitest";

import type { LetterMeta } from "@withink/api-client";

import { countActiveLetters, groupLetters } from "./letters";

function letter(
  id: string,
  unlockDate: string,
  readAt: string | null = null,
  sealed = false,
): LetterMeta {
  return {
    id,
    unlockDate,
    title: id,
    wordCount: 0,
    sealed,
    readAt,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("groupLetters", () => {
  const today = "2026-06-10";

  it("treats the unlock day itself as delivered", () => {
    const grouped = groupLetters([letter("today", "2026-06-10")], today);
    expect(grouped.arrivedUnread.map((item) => item.id)).toEqual(["today"]);
    expect(grouped.pending).toHaveLength(0);
  });

  it("splits pending, unread arrivals and opened letters", () => {
    const grouped = groupLetters(
      [
        letter("future", "2027-01-01"),
        letter("unread", "2026-06-01"),
        letter("opened", "2026-05-01", "2026-05-01T09:00:00.000Z"),
      ],
      today,
    );

    expect(grouped.pending.map((item) => item.id)).toEqual(["future"]);
    expect(grouped.arrivedUnread.map((item) => item.id)).toEqual(["unread"]);
    expect(grouped.opened.map((item) => item.id)).toEqual(["opened"]);
  });

  it("sorts pending soonest first and opened newest first", () => {
    const grouped = groupLetters(
      [
        letter("far", "2028-01-01"),
        letter("near", "2026-07-01"),
        letter("older", "2026-01-01", "2026-01-01T00:00:00.000Z"),
        letter("newer", "2026-05-01", "2026-05-01T00:00:00.000Z"),
      ],
      today,
    );

    expect(grouped.pending.map((item) => item.id)).toEqual(["near", "far"]);
    expect(grouped.opened.map((item) => item.id)).toEqual(["newer", "older"]);
  });
});

describe("countActiveLetters", () => {
  it("counts only letters that still occupy a slot", () => {
    const count = countActiveLetters(
      [
        letter("future", "2027-01-01"),
        letter("delivered", "2026-06-01"),
        letter("today", "2026-06-10"),
        letter("opened", "2026-05-01", "2026-05-01T00:00:00.000Z"),
      ],
      "2026-06-10",
    );

    expect(count).toBe(1);
  });
});
