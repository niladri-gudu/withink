/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getInsightsAction } from "./insights-actions";
import { auth } from "@/lib/auth";
import { InsightsService } from "../services/insights-service";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
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
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const result = await getInsightsAction("2026-07-06", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(InsightsService.getInsights).not.toHaveBeenCalled();
  });

  it("should retrieve insights from service layer and return success on authenticated session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const mockInsightsPayload = {
      streaks: { currentStreak: 3, longestStreak: 12 },
      moodStats: { averageMood: 4.2 },
    };
    vi.mocked(InsightsService.getInsights).mockResolvedValue(mockInsightsPayload as any);

    const result = await getInsightsAction("2026-07-06", -330);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockInsightsPayload);
    expect(InsightsService.getInsights).toHaveBeenCalledWith(mockUserId, "2026-07-06", -330);
  });

  it("should handle error gracefully and return standard error payload if service throws", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    vi.mocked(InsightsService.getInsights).mockRejectedValue(new Error("Failed to compute insights"));

    const result = await getInsightsAction("2026-07-06", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred. Please try again later.");
  });
});
