import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestSession } from "@/lib/request-cache";

import { requireApiSession } from "./_lib";

vi.mock("@/lib/request-cache", () => ({ getRequestSession: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({
  isBearerRequest: vi.fn(async () => true),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/server/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: { isSessionUnlocked: vi.fn(async () => true) },
}));

/** Mirrors Better Auth's thrown APIError shape. */
function sessionError(statusCode: number) {
  return Object.assign(new Error("Failed to get session"), { statusCode });
}

function statusOf(result: Awaited<ReturnType<typeof requireApiSession>>) {
  return result.response ? result.response.status : null;
}

describe("requireApiSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the session lookup reports a missing session", async () => {
    vi.mocked(getRequestSession).mockRejectedValue(sessionError(401));

    await expect(requireApiSession("test")).resolves.toMatchObject({
      response: expect.anything(),
    });
    expect(statusOf(await requireApiSession("test"))).toBe(401);
  });

  it("returns 500 when the session store itself failed", async () => {
    vi.mocked(getRequestSession).mockRejectedValue(sessionError(500));

    expect(statusOf(await requireApiSession("test"))).toBe(500);
  });

  it("returns 401 for a null session", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null as never);

    expect(statusOf(await requireApiSession("test"))).toBe(401);
  });

  it("passes a live session through", async () => {
    vi.mocked(getRequestSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    await expect(requireApiSession("test")).resolves.toEqual({
      userId: "user-1",
    });
  });
});
