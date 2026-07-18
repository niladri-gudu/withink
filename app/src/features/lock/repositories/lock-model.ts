import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface ILockSettings extends Document {
  userId: string;
  isLockEnabled: boolean;
  passcodeHash: string; // bcrypt hash of the passcode
  autoLockTimeout: number; // in seconds (e.g. 0 = immediately, 60 = 1m, 300 = 5m, etc.)
  lockOnTabHide: boolean; // default true
  createdAt: Date;
  updatedAt: Date;
}

const LockSettingsSchema = new Schema<ILockSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    isLockEnabled: { type: Boolean, default: false },
    passcodeHash: { type: String, default: "" },
    autoLockTimeout: { type: Number, default: 300 }, // 5 minutes default
    lockOnTabHide: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const LockSettingsModel =
  mongoose.models.LockSettings ||
  mongoose.model<ILockSettings>("LockSettings", LockSettingsSchema);
