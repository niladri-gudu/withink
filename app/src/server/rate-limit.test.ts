import { describe, it, expect, vi, beforeEach } from "vitest";

// Pipeline stub: each chainable method records its call and returns `this`,
// so `redis.pipeline().incr(k).expire(k, ttl).ttl(k).exec()` acts like the real
// Upstash client. `exec()` resolves to the configured `[count, expire, ttl]`.
function createPipelineStub() {
  const calls = {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  };

  const exec = vi.fn(async () => [1, 1, 60] as [number, number, number]);

  const chain = {
    incr(key: string) {
      calls.incr(key);
      return chain;
    },
    expire(key: string, seconds: number) {
      calls.expire(key, seconds);
      return chain;
    },
    ttl(key: string) {
      calls.ttl(key);
      return chain;
    },
    exec() {
      return exec();
    },
  };

  return { chain, calls, exec };
}

const pipelineStub = createPipelineStub();

const mockRedis = {
  pipeline: vi.fn(() => pipelineStub.chain),
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
    pipelineStub.exec.mockResolvedValue([1, 1, 60]);
  });

  it("allows the first request and sets the window expiry in a single round-trip", async () => {
    pipelineStub.exec.mockResolvedValue([1, 1, 60]);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.resetSeconds).toBe(60);
    // One pipelined round-trip — not three sequential calls.
    expect(mockRedis.pipeline).toHaveBeenCalledTimes(1);
    expect(pipelineStub.exec).toHaveBeenCalledTimes(1);
    expect(pipelineStub.calls.incr).toHaveBeenCalledWith("ratelimit:feedback:user-1");
    expect(pipelineStub.calls.expire).toHaveBeenCalledWith(
      "ratelimit:feedback:user-1",
      60,
    );
    expect(pipelineStub.calls.ttl).toHaveBeenCalledWith("ratelimit:feedback:user-1");
  });

  it("refreshes the expiry on every request, so a crashed window still expires", async () => {
    pipelineStub.exec.mockResolvedValue([2, 1, 42]);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.resetSeconds).toBe(42);
    // expire is set on every hit — not only on count===1 — to survive a crash
    // between incr and expire that would otherwise leak a never-expiring key.
    expect(pipelineStub.calls.expire).toHaveBeenCalledWith(
      "ratelimit:feedback:user-1",
      60,
    );
  });

  it("blocks once the limit is exceeded", async () => {
    pipelineStub.exec.mockResolvedValue([4, 1, 30]);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetSeconds).toBe(30);
  });

  it("falls back to the configured window when TTL reports no expiry", async () => {
    pipelineStub.exec.mockResolvedValue([2, 1, -1]);

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.resetSeconds).toBe(60);
  });

  it("fails open (allows) when Redis is not configured", async () => {
    mockRedisRef.current = null;

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(OPTS.limit);
    expect(mockRedis.pipeline).not.toHaveBeenCalled();
  });

  it("fails open (allows) when the pipeline rejects", async () => {
    pipelineStub.exec.mockRejectedValue(new Error("connection reset"));

    const result = await rateLimit("feedback:user-1", OPTS);

    expect(result.success).toBe(true);
  });
});
