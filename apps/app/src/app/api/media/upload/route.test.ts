/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock everything the upload route touches around its quota decision.
vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: {
    isSessionUnlocked: vi.fn().mockResolvedValue(true),
  },
}));

const mockedGetEntitlements = vi.fn();

vi.mock("@/features/billing/services/entitlements-service", () => ({
  EntitlementsService: {
    getEntitlements: (...args: unknown[]) =>
      mockedGetEntitlements(...args),
  },
}));

vi.mock("@/lib/redis", () => ({
  // 98MB already used in the Redis counter (self-seeded from R2).
  getCachedValue: vi.fn().mockResolvedValue(98 * 1024 * 1024),
  setCachedValue: vi.fn(),
  incrementCachedValue: vi.fn(),
  redis: null,
}));

vi.mock("@/lib/r2", () => ({ r2: {} }));
vi.mock("@/lib/r2-list", () => ({ listAllObjects: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/upload"),
}));

import { getRequestSession } from "@/lib/request-cache";
import { POST } from "./route";

const FREE_LIMIT = 100 * 1024 * 1024;
const mockSession = { user: { id: "user-1" } };

function post(body: Record<string, unknown>) {
  return POST({
    json: async () => body,
  } as any);
}

describe("media upload quota gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    mockedGetEntitlements.mockResolvedValue({
      mediaStorageBytes: FREE_LIMIT,
    });
  });

  it("rejects journal photos past the plan quota with a structured 507", async () => {
    const res = await post({
      // 98MB used + 4MB file > 100MB free tier (stays under the 5MB/file cap)
      filename: "photo.jpg",
      contentType: "image/jpeg",
      size: 4 * 1024 * 1024,
    });

    expect(res.status).toBe(507);
    const payload = await res.json();
    expect(payload.code).toBe("storage_quota_exceeded");
    expect(payload.limitBytes).toBe(FREE_LIMIT);
  });

  it("does not charge avatar uploads against the photo quota", async () => {
    const res = await post({
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      size: 4 * 1024 * 1024,
      folder: "avatar",
    });

    expect(res.status).toBe(200);
    expect(mockedGetEntitlements).not.toHaveBeenCalled();
  });

  it("does not charge feedback attachments against the photo quota", async () => {
    const res = await post({
      filename: "issue.jpg",
      contentType: "image/jpeg",
      size: 4 * 1024 * 1024,
      folder: "feedback",
    });

    expect(res.status).toBe(200);
    expect(mockedGetEntitlements).not.toHaveBeenCalled();
  });
});
