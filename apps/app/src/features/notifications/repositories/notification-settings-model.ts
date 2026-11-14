import mongoose, { Schema, type Document } from "mongoose";

/**
 * Per-user push reminder preferences.
 *
 * `timezoneOffsetMinutes` is `Date.getTimezoneOffset()` from the last device
 * that saved settings (minutes to ADD to local time to reach UTC). The cron
 * sender uses it to resolve the user's local clock without a request cookie.
 */
export interface INotificationSettings extends Document {
  userId: string;
  dailyReminderEnabled: boolean;
  /** Local wall-clock time, "HH:mm" (24h). */
  reminderTime: string;
  letterAlertsEnabled: boolean;
  timezoneOffsetMinutes: number;
  /** Local date (YYYY-MM-DD) of the last daily reminder, for idempotency. */
  lastReminderLocalDate: string | null;
  /** Local date of the last letter-arrival notification. */
  lastLetterLocalDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSettingsSchema = new Schema<INotificationSettings>(
  {
    userId: { type: String, required: true },
    dailyReminderEnabled: { type: Boolean, default: false },
    reminderTime: { type: String, default: "20:00" },
    letterAlertsEnabled: { type: Boolean, default: false },
    timezoneOffsetMinutes: { type: Number, default: 0 },
    lastReminderLocalDate: { type: String, default: null },
    lastLetterLocalDate: { type: String, default: null },
  },
  { timestamps: true },
);

NotificationSettingsSchema.index({ userId: 1 }, { unique: true });
// The cron scans only users with at least one enabled reminder.
NotificationSettingsSchema.index({
  dailyReminderEnabled: 1,
  letterAlertsEnabled: 1,
});

export const NotificationSettingsModel =
  mongoose.models.NotificationSettings ||
  mongoose.model<INotificationSettings>(
    "NotificationSettings",
    NotificationSettingsSchema,
  );
