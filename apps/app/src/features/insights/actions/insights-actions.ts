"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { handleError } from "@/server/errors";
import { LockService } from "@/features/lock/services/lock-service";

import {
  InsightsService,
  type InsightsPayload,
} from "../services/insights-service";

export async function getInsightsAction(
  todayStr: string,
  timezoneOffset = 0,
): Promise<{
  success: boolean;
  data?: InsightsPayload;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const payload = await InsightsService.getInsights(
      session.user.id,
      todayStr,
      timezoneOffset,
    );

    return {
      success: true,
      data: payload,
    };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
