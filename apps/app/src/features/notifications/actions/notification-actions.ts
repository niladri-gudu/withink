"use server";

import { z } from "zod";

import { env } from "@/config/env";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";

import { ExpoPushTokenRepository } from "../repositories/expo-push-token-repository";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettingsRepository,
} from "../repositories/notification-settings-repository";
import { PushSubscriptionRepository } from "../repositories/push-subscription-repository";
import {
  isAllowedPushEndpoint,
  isPushConfigured,
  PushService,
} from "../services/push-service";

const settingsSchema = z.object({
  dailyReminderEnabled: z.boolean(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid time."),
  letterAlertsEnabled: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(300).optional(),
});

export interface NotificationSettingsView {
  dailyReminderEnabled: boolean;
  reminderTime: string;
  letterAlertsEnabled: boolean;
  timezoneOffsetMinutes: number;
}

export interface GetNotificationSettingsResult {
  success: boolean;
  configured: boolean;
  publicKey: string | null;
  deviceCount: number;
  settings: NotificationSettingsView;
  error?: string;
}

export async function getNotificationSettingsAction(): Promise<GetNotificationSettingsResult> {
  try {
    const session = await getRequestSession();
    if (!session?.user) {
      return {
        success: false,
        configured: false,
        publicKey: null,
        deviceCount: 0,
        settings: { ...DEFAULT_NOTIFICATION_SETTINGS },
        error: "You must be signed in.",
      };
    }

    const [doc, webDevices, expoDevices] = await Promise.all([
      NotificationSettingsRepository.get(session.user.id),
      PushSubscriptionRepository.countByUser(session.user.id),
      ExpoPushTokenRepository.countByUser(session.user.id),
    ]);
    const deviceCount = webDevices + expoDevices;

    return {
      success: true,
      configured: isPushConfigured(),
      publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
      deviceCount,
      settings: {
        dailyReminderEnabled:
          doc?.dailyReminderEnabled ??
          DEFAULT_NOTIFICATION_SETTINGS.dailyReminderEnabled,
        reminderTime:
          doc?.reminderTime ?? DEFAULT_NOTIFICATION_SETTINGS.reminderTime,
        letterAlertsEnabled:
          doc?.letterAlertsEnabled ??
          DEFAULT_NOTIFICATION_SETTINGS.letterAlertsEnabled,
        timezoneOffsetMinutes:
          doc?.timezoneOffsetMinutes ??
          DEFAULT_NOTIFICATION_SETTINGS.timezoneOffsetMinutes,
      },
    };
  } catch (error) {
    logger.error(
      "Failed to read notification settings",
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      configured: false,
      publicKey: null,
      deviceCount: 0,
      settings: { ...DEFAULT_NOTIFICATION_SETTINGS },
      error: "Could not load reminder settings.",
    };
  }
}

export async function saveNotificationSettingsAction(input: {
  dailyReminderEnabled: boolean;
  reminderTime: string;
  letterAlertsEnabled: boolean;
  timezoneOffsetMinutes: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session?.user)
      return { success: false, error: "You must be signed in." };

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid settings.",
      };
    }

    await NotificationSettingsRepository.upsert(session.user.id, parsed.data);
    return { success: true };
  } catch (error) {
    const appError = handleError(error);
    logger.error(
      "Failed to save notification settings",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}

export async function subscribePushAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session?.user)
      return { success: false, error: "You must be signed in." };

    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid push subscription." };
    }

    // The endpoint is later fetched by the server. Only known push-service
    // origins may be stored; anything else would turn sending into SSRF.
    if (!isAllowedPushEndpoint(parsed.data.endpoint)) {
      return { success: false, error: "Unsupported push endpoint." };
    }

    await PushSubscriptionRepository.upsert(session.user.id, parsed.data);
    return { success: true };
  } catch (error) {
    const appError = handleError(error);
    logger.error(
      "Failed to save push subscription",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}

export async function sendTestNotificationAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session?.user)
      return { success: false, error: "You must be signed in." };
    if (!isPushConfigured()) {
      return { success: false, error: "Reminders aren't configured yet." };
    }

    // Sends hit every subscribed device and an external push service; cap
    // manual triggers so the action cannot be used as a push/SSRF amplifier.
    const limit = await rateLimit(`push-test:${session.user.id}`, {
      limit: 5,
      windowSeconds: 3_600,
    });
    if (!limit.success) {
      return {
        success: false,
        error: "Too many test notifications. Please try again later.",
      };
    }

    const send = await PushService.sendToUser(session.user.id, {
      title: "Withink",
      body: "Notifications are working. See you on the page.",
      url: "/",
      tag: "withink-test",
    });

    return send.sent > 0
      ? { success: true }
      : {
          success: false,
          error: "No subscribed device received it. Try toggling a reminder.",
        };
  } catch (error) {
    const appError = handleError(error);
    logger.error(
      "Failed to send test notification",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}

export async function unsubscribePushAction(
  endpoint: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session?.user)
      return { success: false, error: "You must be signed in." };

    const parsed = z.string().url().safeParse(endpoint);
    if (!parsed.success) {
      return { success: false, error: "Invalid push subscription." };
    }

    await PushSubscriptionRepository.deleteByEndpoint(
      session.user.id,
      parsed.data,
    );
    return { success: true };
  } catch (error) {
    const appError = handleError(error);
    logger.error(
      "Failed to remove push subscription",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}
