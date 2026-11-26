import { describe, expect, it } from "vitest";

import {
  mintUnlockToken,
  parseUnlockToken,
  UNLOCK_TOKEN_TTL_SECONDS,
  verifyUnlockToken,
} from "./unlock-token";

describe("unlock token", () => {
  it("mints a token that verifies for the same user", () => {
    const { token, expiresAt } = mintUnlockToken("user-1", 60);
    expect(token).toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(verifyUnlockToken(token, "user-1")).toBe(true);
    expect(parseUnlockToken(token)).toMatchObject({ userId: "user-1" });
  });

  it("rejects another user's token", () => {
    const { token } = mintUnlockToken("user-1", 60);
    expect(verifyUnlockToken(token, "user-2")).toBe(false);
  });

  it("rejects an expired token", () => {
    const { token, expiresAt } = mintUnlockToken("user-1", 60);
    expect(verifyUnlockToken(token, "user-1", expiresAt + 1)).toBe(false);
  });

  it("rejects tampered or malformed tokens", () => {
    const { token } = mintUnlockToken("user-1", 60);
    expect(verifyUnlockToken(`${token}00`, "user-1")).toBe(false);
    expect(verifyUnlockToken("not-a-token", "user-1")).toBe(false);
    expect(parseUnlockToken("")).toBeNull();
  });

  it("defaults to the native 15-minute window", () => {
    const before = Date.now();
    const { expiresAt } = mintUnlockToken("user-1");
    expect(expiresAt - before).toBeGreaterThanOrEqual(
      UNLOCK_TOKEN_TTL_SECONDS * 1000 - 1000,
    );
  });
});
