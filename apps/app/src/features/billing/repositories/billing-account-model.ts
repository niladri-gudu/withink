import mongoose, { Schema, type Document } from "mongoose";

/**
 * Billing state for one user. Created lazily by the Dodo webhook on first
 * payment; absence of a row simply means the Free tier (no signup row).
 */
export interface IBillingAccount extends Document {
  userId: string;
  /** Last known paid plan. Only meaningful while status grants access. */
  plan: "free" | "plus" | "pro";
  /** One-time purchase — resolves to Pro forever, ignoring plan/status. */
  lifetime: boolean;
  interval: "monthly" | "yearly" | null;
  status: "active" | "canceled" | "past_due";
  dodoCustomerId: string;
  dodoSubscriptionId: string;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BillingAccountSchema = new Schema<IBillingAccount>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    plan: {
      type: String,
      enum: ["free", "plus", "pro"],
      default: "free",
    },
    lifetime: { type: Boolean, default: false },
    interval: {
      type: String,
      enum: ["monthly", "yearly", null],
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due"],
      default: "active",
    },
    dodoCustomerId: { type: String, default: "" },
    dodoSubscriptionId: { type: String, default: "" },
    currentPeriodEnd: { type: Date, default: null },
  },
  { timestamps: true },
);

export const BillingAccountModel =
  mongoose.models.BillingAccount ||
  mongoose.model<IBillingAccount>("BillingAccount", BillingAccountSchema);
