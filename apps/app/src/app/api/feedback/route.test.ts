import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { submitFeedbackAction } from "@/features/feedback/actions/feedback-actions";

import type * as apiLib from "../_lib";
import { POST } from "./route";

vi.mock("../_lib", async (importOriginal) => {
  const actual = await importOriginal<typeof apiLib>();
  return {
    ...actual,
    requireApiSession: vi.fn(async () => ({ userId: "user-1" })),
  };
});

vi.mock("@/features/feedback/actions/feedback-actions", () => ({
  submitFeedbackAction: vi.fn(),
}));

const valid = {
  category: "bug",
  subject: "Sync stalls",
  message: "The queue stops after a long offline stretch.",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(submitFeedbackAction).mockResolvedValue({ success: true });
  });

  it("submits the parsed payload through the shared action", async () => {
    const res = await POST(request(valid));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(submitFeedbackAction).toHaveBeenCalledWith(valid);
  });

  it("rejects an invalid body without calling the action", async () => {
    const res = await POST(request({ ...valid, subject: "x" }));

    expect(res.status).toBe(400);
    expect(submitFeedbackAction).not.toHaveBeenCalled();
  });

  it("surfaces the hourly limit as rate limited", async () => {
    vi.mocked(submitFeedbackAction).mockResolvedValue({
      success: false,
      error: "You've sent a lot of feedback recently. Please try again later.",
      code: "RATE_LIMITED",
    });

    const res = await POST(request(valid));

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "RATE_LIMITED" });
  });
});
