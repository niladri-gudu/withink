import mongoose, { Schema, type Document } from "mongoose";

export interface ILockSettings extends Document {
  userId: string;
  isLockEnabled: boolean;
  passcodeHash: string; // pbkdf2 hash of the passcode
  autoLockTimeout: number; // in seconds (e.g. 0 = immediately, 60 = 1m, 300 = 5m, etc.)
  lockOnTabHide: boolean; // default false
  // sha256 of the client-derived unlock proof subkey (HKDF over the master
  // key). Proves possession of the diary master key before the unlock cookie
  // can be minted. Empty string = not yet bound (trust-on-first-use).
  unlockProofHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const LockSettingsSchema = new Schema<ILockSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    isLockEnabled: { type: Boolean, default: false },
    passcodeHash: { type: String, default: "" },
    autoLockTimeout: { type: Number, default: 300 }, // 5 minutes default
    lockOnTabHide: { type: Boolean, default: false },
    unlockProofHash: { type: String, default: "" },
  },
  { timestamps: true },
);

export const LockSettingsModel =
  mongoose.models.LockSettings ||
  mongoose.model<ILockSettings>("LockSettings", LockSettingsSchema);
