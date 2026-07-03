"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InsightsService } from "../services/insights-service";
import type { InsightsPayload } from "../services/insights-service";
import { handleError } from "@/server/errors";

export async function getInsightsAction(
  todayStr: string,
  timezoneOffset = 0
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

    const payload = await InsightsService.getInsights(
      session.user.id,
      todayStr,
      timezoneOffset
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
