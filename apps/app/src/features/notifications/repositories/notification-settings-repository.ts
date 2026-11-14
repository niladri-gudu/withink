import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";

import {
  NotificationSettingsModel,
  type INotificationSettings,
} from "./notification-settings-model";

// The `mongoose.models.X || mongoose.model(...)` union isn't callable under
// TypeScript; narrow it to a concrete model (same pattern as the other repos).
const notificationSettingsModel =
  NotificationSettingsModel as Model<INotificationSettings>;

export interface NotificationSettingsRecord {
  userId: string;
  dailyReminderEnabled: boolean;
  reminderTime: string;
  letterAlertsEnabled: boolean;
  timezoneOffsetMinutes: number;
  lastReminderLocalDate: string | null;
  lastLetterLocalDate: string | null;
}

export const DEFAULT_NOTIFICATION_SETTINGS: Omit<
  NotificationSettingsRecord,
  "userId"
> = {
  dailyReminderEnabled: false,
  reminderTime: "20:00",
  letterAlertsEnabled: false,
  timezoneOffsetMinutes: 0,
  lastReminderLocalDate: null,
  lastLetterLocalDate: null,
};

export class NotificationSettingsRepository {
  static async get(userId: string): Promise<NotificationSettingsRecord | null> {
    await connectDB();
    const doc = await notificationSettingsModel.findOne({ userId }).lean();
    return (doc as unknown as NotificationSettingsRecord) ?? null;
  }

  static async upsert(
    userId: string,
    data: Partial<Omit<NotificationSettingsRecord, "userId">>,
  ): Promise<NotificationSettingsRecord> {
    await connectDB();
    const doc = await notificationSettingsModel.findOneAndUpdate(
      { userId },
      { $set: data, $setOnInsert: { userId } },
      { upsert: true, new: true, lean: true },
    );
    return doc as unknown as NotificationSettingsRecord;
  }

  /** Settings rows with at least one reminder enabled — the cron work list. */
  static async listEnabled(): Promise<NotificationSettingsRecord[]> {
    await connectDB();
    const docs = await notificationSettingsModel.find({
      $or: [
        { dailyReminderEnabled: true },
        { letterAlertsEnabled: true },
      ],
    }).lean();
    return docs as unknown as NotificationSettingsRecord[];
  }

  static async markReminderSent(
    userId: string,
    localDate: string,
  ): Promise<void> {
    await connectDB();
    await notificationSettingsModel.updateOne(
      { userId },
      { $set: { lastReminderLocalDate: localDate } },
    );
  }

  static async markLetterNotified(
    userId: string,
    localDate: string,
  ): Promise<void> {
    await connectDB();
    await notificationSettingsModel.updateOne(
      { userId },
      { $set: { lastLetterLocalDate: localDate } },
    );
  }
}

export type NotificationSettingsDoc = INotificationSettings;
