/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
const IV_LENGTH = 12;

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (
    !encryptedData ||
    typeof encryptedData !== "string" ||
    !encryptedData.includes(":")
  ) {
    return encryptedData;
  }

  const parts = encryptedData.split(":");
  if (parts.length < 3) return encryptedData;

  const encryptedText = parts.pop()!;
  const authTagHex = parts.pop()!;
  const ivHex = parts.pop()!;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (e) {
    console.error("Decryption failed. Key might be wrong.");
    return "DECRYPTION_ERROR";
  }
}

export function safeDecrypt(data: any): any {
  if (!data || typeof data !== "string" || !data.includes(":")) return data;
  try {
    return decrypt(data);
  } catch (e) {
    return data;
  }
}
