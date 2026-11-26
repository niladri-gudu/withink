import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestSession } from "@/lib/request-cache";
import { verifyUnlockToken } from "@/lib/unlock-token";
import { rateLimit } from "@/server/rate-limit";
import { LockRepository } from "@/features/lock/repositories/lock-repository";
import { LockService } from "@/features/lock/services/lock-service";

import { POST } from "./route";

vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: null,
  getCachedValue: vi.fn(),
  setCachedValue: vi.fn(),
}));

vi.mock("@/features/lock/repositories/lock-repository", () => ({
  LockRepository: {
    getSettings: vi.fn(),
  },
}));

vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: {
    verifyUnlockProofHash: vi.fn(),
  },
}));

const mockSession = { user: { id: "user-1" } };
const VALID_PROOF = "a".repeat(64);

function post(body: unknown): Request {
  return new Request("http://localhost/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/unlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as never);
    vi.mocked(rateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(LockRepository.getSettings).mockResolvedValue({
      isLockEnabled: true,
      unlockProofHash: "stored-hash",
    } as never);
    vi.mocked(LockService.verifyUnlockProofHash).mockReturnValue(true);
  });

  it("rejects an unauthenticated request", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null);
    const res = await POST(post({ proof: VALID_PROOF }) as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an invalid proof shape", async () => {
    const res = await POST(post({ proof: "short" }) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("reports an unbound legacy account", async () => {
    vi.mocked(LockRepository.getSettings).mockResolvedValue({
      isLockEnabled: true,
      unlockProofHash: null,
    } as never);
    const res = await POST(post({ proof: VALID_PROOF }) as never);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      code: "UNLOCK_PROOF_NOT_BOUND",
    });
  });

  it("rejects a wrong proof and counts the failure", async () => {
    vi.mocked(LockService.verifyUnlockProofHash).mockReturnValue(false);
    const res = await POST(post({ proof: VALID_PROOF }) as never);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "UNLOCK_PROOF_INVALID" });
    expect(rateLimit).toHaveBeenLastCalledWith(
      "lock:unlock-proof:user-1",
      expect.objectContaining({ limit: 10, failClosed: true }),
    );
  });

  it("rate-limits repeated requests", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false } as never);
    const res = await POST(post({ proof: VALID_PROOF }) as never);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("mints a verifiable token for a valid proof", async () => {
    const res = await POST(post({ proof: VALID_PROOF }) as never);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(verifyUnlockToken(payload.token, "user-1")).toBe(true);
    expect(verifyUnlockToken(payload.token, "user-2")).toBe(false);
  });

  it("mints without checking a proof when the lock is disabled", async () => {
    vi.mocked(LockRepository.getSettings).mockResolvedValue({
      isLockEnabled: false,
    } as never);
    const res = await POST(post({ proof: VALID_PROOF }) as never);
    expect(res.status).toBe(200);
    expect(LockService.verifyUnlockProofHash).not.toHaveBeenCalled();
  });
});
