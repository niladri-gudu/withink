import { describe, expect, it } from "vitest";

import {
  countdownFor,
  isDelivered,
  occupiesSlot,
} from "./letter-rules";

const TODAY = "2026-08-27";

describe("letter delivery rules", () => {
  it("treats the unlock day itself as delivered (opens ON the date)", () => {
    expect(isDelivered("2026-08-27", TODAY)).toBe(true);
    expect(occupiesSlot("2026-08-27", TODAY)).toBe(false);
  });

  it("keeps tomorrow occupied and yesterday delivered", () => {
    expect(occupiesSlot("2026-08-28", TODAY)).toBe(true);
    expect(isDelivered("2026-08-26", TODAY)).toBe(true);
  });

  it("string comparison is exact across month and year boundaries", () => {
    expect(occupiesSlot("2026-09-01", TODAY)).toBe(true);
    expect(occupiesSlot("2027-01-01", TODAY)).toBe(true);
    expect(isDelivered("2025-12-31", TODAY)).toBe(true);
  });
});

describe("countdownFor hand notes", () => {
  it("labels already-delivered letters as opened", () => {
    expect(countdownFor(TODAY, TODAY)).toEqual({
      label: "opened",
      daysAway: 0,
    });
    expect(countdownFor("2026-08-01", TODAY).label).toBe("opened");
  });

  it("says tomorrow for the next day", () => {
    expect(countdownFor("2026-08-28", TODAY)).toEqual({
      label: "opens tomorrow",
      daysAway: 1,
    });
  });

  it("counts small horizons in days", () => {
    expect(countdownFor("2026-08-30", TODAY)).toEqual({
      label: "opens in 3 days",
      daysAway: 3,
    });
  });

  it("switches to a calendar date past four weeks", () => {
    const note = countdownFor("2026-10-06", TODAY);
    expect(note.daysAway).toBe(40);
    expect(note.label).toBe("opens Oct 6");
  });

  it("handles month rollovers exactly", () => {
    expect(countdownFor("2026-09-01", "2026-08-31").label).toBe(
      "opens tomorrow",
    );
  });
});
