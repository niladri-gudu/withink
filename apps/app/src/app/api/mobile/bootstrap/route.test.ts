import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestSession } from "@/lib/request-cache";
import { rateLimit } from "@/server/rate-limit";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LockRepository } from "@/features/lock/repositories/lock-repository";

import { GET } from "./route";

vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock(
  "@/features/encryption/repositories/encryption-settings-repository",
  () => ({
    EncryptionSettingsRepository: { getSettings: vi.fn() },
  }),
);

vi.mock("@/features/lock/repositories/lock-repository", () => ({
  LockRepository: { getSettings: vi.fn() },
}));

const mockSession = {
  user: { id: "user-1", name: "Tester", email: "tester@example.com" },
};

describe("GET /api/mobile/bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as never);
    vi.mocked(rateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(EncryptionSettingsRepository.getSettings).mockResolvedValue({
      isClientEncrypted: true,
      encryptionSalt: "a".repeat(32),
      verificationCiphertext: "iv:tag:cipher",
      kdfIterations: 600_000,
      userId: "user-1",
    } as never);
    vi.mocked(LockRepository.getSettings).mockResolvedValue({
      isLockEnabled: true,
      autoLockTimeout: 300,
      passcodeHash: "server-only-hash",
      unlockProofHash: "server-only-proof-hash",
    } as never);
  });

  it("rejects an unauthenticated request", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rate limits", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false } as never);
    const res = await GET();
    expect(res.status).toBe(429);
  });

  it("returns only safe encryption and lock fields", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toMatchObject({
      user: { id: "user-1", name: "Tester", email: "tester@example.com" },
      encryption: {
        isClientEncrypted: true,
        encryptionSalt: "a".repeat(32),
        verificationCiphertext: "iv:tag:cipher",
        kdfIterations: 600_000,
      },
      lock: { isLockEnabled: true, autoLockTimeout: 300, hasPasscode: true },
    });
    expect(body).not.toHaveProperty("encryption.passcodeHash");
    expect(body).not.toHaveProperty("lock.unlockProofHash");
    expect(JSON.stringify(body)).not.toContain("server-only");
  });

  it("defaults a legacy account with no settings", async () => {
    vi.mocked(EncryptionSettingsRepository.getSettings).mockResolvedValue(
      null as never,
    );
    vi.mocked(LockRepository.getSettings).mockResolvedValue(null as never);
    const res = await GET();
    const body = await res.json();
    expect(body.encryption).toMatchObject({
      isClientEncrypted: false,
      kdfIterations: 100_000,
    });
    expect(body.lock).toMatchObject({
      isLockEnabled: false,
      hasPasscode: false,
    });
  });
});
