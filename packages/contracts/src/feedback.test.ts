import { describe, expect, it } from "vitest";

import { feedbackSchema } from "./feedback";

const valid = {
  category: "bug" as const,
  subject: "Sync stalls",
  message: "The queue stops after a long offline stretch.",
};

describe("feedbackSchema", () => {
  it("accepts a complete submission", () => {
    expect(feedbackSchema.safeParse(valid).success).toBe(true);
  });

  it("trims the subject and message", () => {
    const parsed = feedbackSchema.parse({
      ...valid,
      subject: "  Sync stalls  ",
      message: "  It happens after flights.  ",
    });
    expect(parsed.subject).toBe("Sync stalls");
    expect(parsed.message).toBe("It happens after flights.");
  });

  it("enforces the shared length limits", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, subject: "ab" }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ ...valid, subject: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ ...valid, message: "too short" }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ ...valid, message: "x".repeat(4001) }).success,
    ).toBe(false);
  });

  it("rejects unknown categories and malformed attachment URLs", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, category: "complaint" }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ ...valid, imageUrl: "not-a-url" }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ ...valid, imageUrl: "" }).success,
    ).toBe(true);
  });
});
