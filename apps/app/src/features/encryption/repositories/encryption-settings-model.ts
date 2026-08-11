import mongoose, { Schema, type Document } from "mongoose";

export interface IClientEncryptionSettings extends Document {
  userId: string;
  isClientEncrypted: boolean;
  encryptionSalt: string; // 16-byte random hex generated client-side
  verificationCiphertext: string; // Static verification string encrypted with client-side key
  createdAt: Date;
  updatedAt: Date;
}

const ClientEncryptionSettingsSchema = new Schema<IClientEncryptionSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    isClientEncrypted: { type: Boolean, default: false },
    encryptionSalt: { type: String, default: "" },
    verificationCiphertext: { type: String, default: "" },
  },
  { timestamps: true },
);

export const ClientEncryptionSettingsModel =
  mongoose.models.ClientEncryptionSettings ||
  mongoose.model<IClientEncryptionSettings>(
    "ClientEncryptionSettings",
    ClientEncryptionSettingsSchema,
  );
