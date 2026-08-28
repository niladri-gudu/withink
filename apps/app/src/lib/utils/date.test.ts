import { describe, expect, it } from "vitest";

import { formatNumericDate } from "./date";

describe("formatNumericDate", () => {
  it("renders dd-mm-yyyy with zero padding", () => {
    expect(formatNumericDate("2026-09-21")).toBe("21-09-2026");
    expect(formatNumericDate("2026-01-05")).toBe("05-01-2026");
  });

  it("passes malformed input through unchanged", () => {
    expect(formatNumericDate("not-a-date")).toBe("not-a-date");
    expect(formatNumericDate("")).toBe("");
  });
});
