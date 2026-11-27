import { describe, expect, it } from "vitest";
import type { MobileBootstrap } from "@withink/contracts";
import type { LocalProfile } from "@withink/core";

import { buildLocalProfile } from "./profile";

const bootstrap: MobileBootstrap = {
  user: { id: "user-1", name: "Ada", email: "ada@example.com" },
  encryption: {
    isClientEncrypted: true,
    encryptionSalt: "a".repeat(32),
    verificationCiphertext: "a".repeat(24) + ":" + "b".repeat(32),
    kdfIterations: 600_000,
  },
  lock: { isLockEnabled: true, autoLockTimeout: 300, hasPasscode: true },
};

describe("buildLocalProfile", () => {
  it("maps the server bootstrap into the shared LocalProfile shape", () => {
    const profile = buildLocalProfile({
      bootstrap,
      plan: "plus",
      existing: null,
      nowIso: "2026-11-27T10:00:00.000Z",
    });

    expect(profile).toMatchObject({
      id: "user-1",
      accountId: null,
      createdAt: "2026-11-27T10:00:00.000Z",
      updatedAt: "2026-11-27T10:00:00.000Z",
      encryption: bootstrap.encryption,
      lock: {
        isLockEnabled: true,
        hasPasscode: true,
        autoLockTimeout: 300,
        lockOnTabHide: false,
      },
      user: {
        id: "user-1",
        name: "Ada",
        email: "ada@example.com",
      },
      lastKnownPlan: "plus",
      planCheckedAt: "2026-11-27T10:00:00.000Z",
    });
  });

  it("preserves identity, creation time and the device lock-on-hide choice", () => {
    const existing: LocalProfile = {
      id: "user-1",
      accountId: "account-9",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      encryption: bootstrap.encryption,
      lock: {
        isLockEnabled: true,
        hasPasscode: true,
        autoLockTimeout: 2400,
        lockOnTabHide: true,
      },
      user: { id: "user-1", name: "Ada", email: "ada@example.com" },
      lastKnownPlan: "free",
      planCheckedAt: "2026-01-01T00:00:00.000Z",
    };

    const profile = buildLocalProfile({
      bootstrap,
      plan: "pro",
      existing,
      nowIso: "2026-11-27T11:00:00.000Z",
    });

    expect(profile.accountId).toBe("account-9");
    expect(profile.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(profile.updatedAt).toBe("2026-11-27T11:00:00.000Z");
    expect(profile.lock.lockOnTabHide).toBe(true);
    expect(profile.lastKnownPlan).toBe("pro");
  });
});
