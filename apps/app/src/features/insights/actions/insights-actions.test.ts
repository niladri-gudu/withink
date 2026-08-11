/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestSession } from "@/lib/request-cache";

import { InsightsService } from "../services/insights-service";
import { getInsightsAction } from "./insights-actions";

// Mock LockService
vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: {
    isSessionUnlocked: vi.fn().mockResolvedValue(true),
  },
}));

// Mock getRequestSession (never run the real cache()-wrapped implementation)
vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

// Mock InsightsService
vi.mock("../services/insights-service", () => ({
  InsightsService: {
    getInsights: vi.fn(),
  },
}));

describe("getInsightsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-abc";
  const mockSession = {
    user: {
      id: mockUserId,
    },
  };

  it("should fail and return Unauthorized if user session is missing", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null);

    const result = await getInsightsAction("2026-07-06", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(InsightsService.getInsights).not.toHaveBeenCalled();
  });

  it("should retrieve insights from service layer and return success on authenticated session", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    const mockInsightsPayload = {
      streaks: { currentStreak: 3, longestStreak: 12 },
      moodStats: { averageMood: 4.2 },
    };
    vi.mocked(InsightsService.getInsights).mockResolvedValue(
      mockInsightsPayload as any,
    );

    const result = await getInsightsAction("2026-07-06", -330);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockInsightsPayload);
    expect(InsightsService.getInsights).toHaveBeenCalledWith(
      mockUserId,
      "2026-07-06",
      -330,
    );
  });

  it("should handle error gracefully and return standard error payload if service throws", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(InsightsService.getInsights).mockRejectedValue(
      new Error("Failed to compute insights"),
    );

    const result = await getInsightsAction("2026-07-06", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "An unexpected error occurred. Please try again later.",
    );
  });
});
