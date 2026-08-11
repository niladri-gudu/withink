"use server";

import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { LockService } from "@/features/lock/services/lock-service";

import {
  FlashbackService,
  type FlashbackResponse,
} from "../services/flashback-service";

export async function getFlashbackAction(localToday: string): Promise<{
  success: boolean;
  data?: FlashbackResponse | null;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const data = await FlashbackService.getFlashbackForToday(
      session.user.id,
      localToday,
    );
    return { success: true, data };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function refreshFlashbackAction(localToday: string): Promise<{
  success: boolean;
  data?: FlashbackResponse | null;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const data = await FlashbackService.refreshFlashback(
      session.user.id,
      localToday,
    );
    return { success: true, data };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
