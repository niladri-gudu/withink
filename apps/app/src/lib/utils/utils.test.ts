import { cn } from "@withink/utils";
import { describe, expect, it } from "vitest";

import { getLocalDateString, isDateString } from "./date";
import { countWords } from "./text";

describe("Utils Smoke Tests", () => {
  describe("cn (tailwind merge + clsx)", () => {
    it("should merge classes correctly", () => {
      expect(cn("px-2 py-1", "py-2")).toBe("px-2 py-2");
    });

    it("should handle conditional classes", () => {
      expect(cn("class-a", false && "class-b", "class-c")).toBe(
        "class-a class-c",
      );
    });
  });

  describe("countWords", () => {
    it("should return correct word count", () => {
      expect(countWords("Hello world this is withink")).toBe(5);
    });

    it("should return zero for empty string", () => {
      expect(countWords("   ")).toBe(0);
    });
  });

  describe("date", () => {
    it("should validate ISO dates correctly", () => {
      expect(isDateString("2026-07-01")).toBe(true);
      expect(isDateString("2026/07/01")).toBe(false);
      expect(isDateString("not-a-date")).toBe(false);
    });

    it("should generate correct local date string format", () => {
      const date = new Date(2026, 6, 1); // July is index 6
      expect(getLocalDateString(date)).toBe("2026-07-01");
    });
  });
});
