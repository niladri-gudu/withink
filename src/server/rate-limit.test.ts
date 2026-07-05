import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
};

vi.mock("@/lib/redis", () => ({
  get redis() {
    return mockRedisRef.current;
  },
}));

// Indirection so individual tests can swap the client to null (Redis absent).
const mockRedisRef: { current: typeof mockRedis | null } = { current: mockRedis };

// Imported after the mock is registered.
const { rateLimit } = await import("./rate-limit");

const OPTS = { limit: 3, windowSeconds: 60 };

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisRef.current = mockRedis;
  });

  it("allows the first request and starts the window expiry", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(mockRedis.expire).toHaveBeenCalledWith("ratelimit:feedback:user-1", 60);
  });

  it("does not reset expiry on subsequent requests in the window", async () => {
    mockRedis.incr.mockResolvedValue(2);
    mockRedis.ttl.mockResolvedValue(42);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it("blocks once the limit is exceeded", async () => {
    mockRedis.incr.mockResolvedValue(4);
    mockRedis.ttl.mockResolvedValue(30);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetSeconds).toBe(30);
  });

  it("fails open (allows) when Redis is not configured", async () => {
    mockRedisRef.current = null;

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(OPTS.limit);
  });

  it("fails open (allows) when Redis throws", async () => {
    mockRedis.incr.mockRejectedValue(new Error("connection reset"));

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
  });
});
