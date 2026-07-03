"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FlashbackService } from "../services/flashback-service";
import type { FlashbackResponse } from "../services/flashback-service";
import { handleError } from "@/server/errors";

export async function getFlashbackAction(
  localToday: string,
): Promise<{ success: boolean; data?: FlashbackResponse | null; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await FlashbackService.getFlashbackForToday(session.user.id, localToday);
    return { success: true, data };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function refreshFlashbackAction(
  localToday: string,
): Promise<{ success: boolean; data?: FlashbackResponse | null; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await FlashbackService.refreshFlashback(session.user.id, localToday);
    return { success: true, data };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
