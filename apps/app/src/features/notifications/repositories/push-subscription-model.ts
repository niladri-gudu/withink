import mongoose, { Schema, type Document } from "mongoose";

/**
 * One Web Push subscription per device/browser. The endpoint is globally
 * unique, so signing in again from the same browser updates the row instead
 * of duplicating it.
 */
export interface IPushSubscription extends Document {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true },
    endpoint: { type: String, required: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>(
    "PushSubscription",
    PushSubscriptionSchema,
  );
