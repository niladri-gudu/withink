import { describe, expect, it } from "vitest";

import { UNLOCK_HEADER_NAME, unlockRequestSchema } from "./unlock";

describe("unlockRequestSchema", () => {
  it("accepts a 32-byte hex proof", () => {
    expect(unlockRequestSchema.safeParse({ proof: "a".repeat(64) }).success).toBe(
      true,
    );
  });

  it("rejects short, non-hex, or missing proofs", () => {
    expect(
      unlockRequestSchema.safeParse({ proof: "a".repeat(63) }).success,
    ).toBe(false);
    expect(unlockRequestSchema.safeParse({ proof: "z".repeat(64) }).success).toBe(
      false,
    );
    expect(unlockRequestSchema.safeParse({}).success).toBe(false);
  });

  it("uses a lowercase header name", () => {
    expect(UNLOCK_HEADER_NAME).toBe("x-withink-unlock");
  });
});
