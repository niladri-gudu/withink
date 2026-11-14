import "server-only";

import { EntryRepository } from "@/features/journal/repositories/entry-repository";
import { LetterModel } from "@/features/letters/repositories/letter-model";

import { NotificationSettingsRepository } from "../repositories/notification-settings-repository";
import { isPushConfigured, PushService } from "./push-service";

/**
 * How long after the user's chosen time a daily reminder may still fire.
 * The cron is expected to run every ~15 minutes; the window makes the sender
 * idempotent and tolerant of a missed tick without nudging at odd hours.
 */
export const REMINDER_WINDOW_MINUTES = 60;

/** Letter-arrival notifications only go out in this local-time window. */
export const LETTER_WINDOW_START_HOUR = 8;
export const LETTER_WINDOW_END_HOUR = 21;

export interface LocalClock {
  date: string;
  minutesOfDay: number;
  hour: number;
}

/**
 * Converts "now" into the user's local wall clock using their stored
 * `Date.getTimezoneOffset()` (minutes to add to local time to reach UTC).
 */
export function resolveLocalClock(
  now: Date,
  timezoneOffsetMinutes: number,
): LocalClock {
  const local = new Date(now.getTime() - timezoneOffsetMinutes * 60_000);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  const hour = local.getUTCHours();
  return {
    date: `${year}-${month}-${day}`,
    hour,
    minutesOfDay: hour * 60 + local.getUTCMinutes(),
  };
}

/** Parses "HH:mm" into minutes of day; null for invalid input. */
export function parseReminderTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface SchedulerResult {
  considered: number;
  remindersSent: number;
  lettersSent: number;
  failed: number;
}

export class NotificationScheduler {
  /**
   * Runs one idempotent pass. Safe to call every few minutes:
   * - a daily reminder fires once per local date, only inside its window;
   * - letter alerts fire once per local date, only during daytime;
   * - writing an entry today suppresses the daily nudge.
   */
  static async run(now = new Date()): Promise<SchedulerResult> {
    const result: SchedulerResult = {
      considered: 0,
      remindersSent: 0,
      lettersSent: 0,
      failed: 0,
    };

    if (!isPushConfigured()) return result;

    const settings = await NotificationSettingsRepository.listEnabled();
    result.considered = settings.length;

    for (const setting of settings) {
      const clock = resolveLocalClock(
        now,
        setting.timezoneOffsetMinutes ?? 0,
      );

      if (
        setting.dailyReminderEnabled &&
        setting.lastReminderLocalDate !== clock.date
      ) {
        const target = parseReminderTime(setting.reminderTime);
        const inWindow =
          target !== null &&
          clock.minutesOfDay >= target &&
          clock.minutesOfDay < target + REMINDER_WINDOW_MINUTES;

        if (inWindow) {
          const entry = await EntryRepository.getEntry(
            setting.userId,
            clock.date,
            clock.date,
          );
          // Mark handled even when they already wrote, so a later tick in the
          // window doesn't nudge them.
          await NotificationSettingsRepository.markReminderSent(
            setting.userId,
            clock.date,
          );

          if (!entry) {
            const send = await PushService.sendToUser(setting.userId, {
              title: "The page is waiting",
              body: "A few quiet minutes for today? Your diary is open.",
              url: "/",
              tag: `daily-${clock.date}`,
            });
            result.remindersSent += send.sent;
            result.failed += send.failed;
          }
        }
      }

      if (
        setting.letterAlertsEnabled &&
        setting.lastLetterLocalDate !== clock.date &&
        clock.hour >= LETTER_WINDOW_START_HOUR &&
        clock.hour < LETTER_WINDOW_END_HOUR
      ) {
        const count = await LetterModel.countDocuments({
          userId: setting.userId,
          unlockDate: { $lte: clock.date },
          readAt: null,
        });

        await NotificationSettingsRepository.markLetterNotified(
          setting.userId,
          clock.date,
        );

        if (count > 0) {
          const send = await PushService.sendToUser(setting.userId, {
            title:
              count === 1
                ? "A letter has arrived"
                : `${count} letters have arrived`,
            body:
              count === 1
                ? "A note from your past self is ready to open."
                : "Notes from your past self are ready to open.",
            url: "/letters",
            tag: `letters-${clock.date}`,
          });
          result.lettersSent += send.sent;
          result.failed += send.failed;
        }
      }
    }

    return result;
  }
}
