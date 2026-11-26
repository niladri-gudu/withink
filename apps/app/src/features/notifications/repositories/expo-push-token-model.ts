import mongoose, { Schema, type Document } from "mongoose";

/**
 * One Expo Push Service token per app install. Tokens are capability tokens:
 * they are never logged and only ever sent to Expo's push endpoint.
 *
 * Web push (VAPID) rows live in `PushSubscription`; this collection covers the
 * native app, so both channels can coexist for one account.
 */
export interface IExpoPushToken extends Document {
  userId: string;
  token: string;
  platform: "ios" | "android";
  deviceLabel: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpoPushTokenSchema = new Schema<IExpoPushToken>(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true },
    platform: { type: String, enum: ["ios", "android"], required: true },
    deviceLabel: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ExpoPushTokenSchema.index({ token: 1 }, { unique: true });
ExpoPushTokenSchema.index({ userId: 1 });

export const ExpoPushTokenModel =
  mongoose.models.ExpoPushToken ||
  mongoose.model<IExpoPushToken>("ExpoPushToken", ExpoPushTokenSchema);
