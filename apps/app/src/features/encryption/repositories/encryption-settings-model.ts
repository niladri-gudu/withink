import mongoose, { Schema, type Document } from "mongoose";

export interface IClientEncryptionSettings extends Document {
  userId: string;
  isClientEncrypted: boolean;
  encryptionSalt: string; // 16-byte random hex generated client-side
  verificationCiphertext: string; // Static verification string encrypted with client-side key
  /**
   * PBKDF2 iterations used to derive the key that wraps the master key.
   * Legacy rows predate this field and default to 100k.
   */
  kdfIterations: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClientEncryptionSettingsSchema = new Schema<IClientEncryptionSettings>(
  {
    userId: { type: String, required: true, unique: true },
    isClientEncrypted: { type: Boolean, default: false },
    encryptionSalt: { type: String, default: "" },
    verificationCiphertext: { type: String, default: "" },
    kdfIterations: { type: Number, default: 100_000 },
  },
  { timestamps: true },
);

export const ClientEncryptionSettingsModel =
  mongoose.models.ClientEncryptionSettings ||
  mongoose.model<IClientEncryptionSettings>(
    "ClientEncryptionSettings",
    ClientEncryptionSettingsSchema,
  );
