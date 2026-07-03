import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "@/config/env";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");
const IV_LENGTH = 12;

/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns colon-separated string: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts ciphertext (iv:authTag:ciphertext) back to cleartext.
 * Gracefully returns original value if not in the correct encrypted format or if decryption fails.
 */
export function decrypt(encryptedData: string): string {
  if (
    !encryptedData ||
    typeof encryptedData !== "string" ||
    !encryptedData.includes(":")
  ) {
    return encryptedData;
  }

  const parts = encryptedData.split(":");
  if (parts.length < 3) {
    return encryptedData;
  }

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
  } catch (error) {
    console.error("Decryption failed. Key might be wrong or data is corrupted.", error);
    return "DECRYPTION_ERROR";
  }
}

/**
 * Safely decrypts data if it appears to be encrypted.
 */
export function safeDecrypt(data: unknown): unknown {
  if (!data || typeof data !== "string" || !data.includes(":")) {
    return data;
  }
  try {
    return decrypt(data);
  } catch {
    return data;
  }
}
