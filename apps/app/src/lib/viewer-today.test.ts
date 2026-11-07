import { describe, expect, it } from "vitest";

import { addDays } from "@/lib/utils/date";

import { clampViewerToday } from "./viewer-today";

function utcToday(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("clampViewerToday", () => {
  it("accepts the real calendar date", () => {
    const today = utcToday();
    expect(clampViewerToday(today)).toBe(today);
  });

  it("allows a one-day timezone difference in either direction", () => {
    const today = utcToday();
    expect(clampViewerToday(addDays(today, 1))).toBe(addDays(today, 1));
    expect(clampViewerToday(addDays(today, -1))).toBe(addDays(today, -1));
  });

  it("rejects a far-future date (backfill-gate bypass attempt)", () => {
    expect(clampViewerToday("2999-01-01")).toBe(utcToday());
  });

  it("rejects a far-past date (letter-unseal attempt)", () => {
    expect(clampViewerToday("2000-01-01")).toBe(utcToday());
  });

  it("falls back to server time for malformed input", () => {
    expect(clampViewerToday("not-a-date")).toBe(utcToday());
    expect(clampViewerToday(undefined)).toBe(utcToday());
    expect(clampViewerToday(null)).toBe(utcToday());
  });
});
