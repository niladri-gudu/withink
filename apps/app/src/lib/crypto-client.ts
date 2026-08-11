// Browser-compatible zero-knowledge cryptographic utilities using native Web Crypto API.
// Works both in browser and modern Node.js environments via globalThis.crypto.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Helper: Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  if (!hex) return new Uint8Array(0);
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Helper: Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper: Generate a secure random salt (16 bytes = 32 hex characters)
export function generateRandomSalt(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// Helper: Generate a secure random 32-byte Master Key
export async function generateMasterKey(): Promise<CryptoKey> {
  return await globalThis.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"],
  );
}

// Export CryptoKey to raw hex string
export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const exported = await globalThis.crypto.subtle.exportKey("raw", key);
  return bytesToHex(new Uint8Array(exported));
}

// Import CryptoKey from raw hex string
export async function importKeyFromHex(hex: string): Promise<CryptoKey> {
  const bytes = hexToBytes(hex);
  return await globalThis.crypto.subtle.importKey(
    "raw",
    bytes as unknown as BufferSource,
    { name: "AES-GCM" },
    true, // extractable
    ["encrypt", "decrypt"],
  );
}

// Derive a key from password and salt using PBKDF2
export async function deriveKeyFromPassword(
  password: string,
  saltHex: string,
  iterations = 100000,
): Promise<CryptoKey> {
  const passwordBytes = encoder.encode(password);
  const saltBytes = hexToBytes(saltHex);

  // Import the password as a raw key for PBKDF2 derivation
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    passwordBytes as unknown as BufferSource,
    { name: "PBKDF2" },
    false, // not extractable
    ["deriveKey", "deriveBits"],
  );

  // Derive an AES-GCM 256-bit key from the password key
  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable (so we can decrypt/encrypt keys with it)
    ["encrypt", "decrypt"],
  );
}

// Encrypt plaintext using an AES-GCM CryptoKey
// Returns colon-separated hex format: "iv:ciphertext"
export async function encryptText(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const plaintextBytes = encoder.encode(plaintext);
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    plaintextBytes as unknown as BufferSource,
  );

  const ciphertextHex = bytesToHex(new Uint8Array(encryptedBuffer));
  const ivHex = bytesToHex(iv);

  return `${ivHex}:${ciphertextHex}`;
}

// Decrypt ciphertext ("iv:ciphertext") using an AES-GCM CryptoKey
export async function decryptText(
  encryptedData: string,
  key: CryptoKey,
): Promise<string> {
  if (!encryptedData || !encryptedData.includes(":")) {
    return encryptedData;
  }

  const parts = encryptedData.split(":");
  if (parts.length < 2) {
    return encryptedData;
  }

  const ivHex = parts[0]!;
  const ciphertextHex = parts[1]!;

  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource,
  );

  return decoder.decode(decryptedBuffer);
}

// Safely decrypt text - returns original string if decryption fails or format is invalid
export async function safeDecryptText(
  encryptedData: string,
  key: CryptoKey | null,
): Promise<string> {
  if (
    !key ||
    !encryptedData ||
    typeof encryptedData !== "string" ||
    !encryptedData.includes(":")
  ) {
    return encryptedData;
  }
  try {
    return await decryptText(encryptedData, key);
  } catch (error) {
    console.error("Failed to decrypt text client-side:", error);
    return "DECRYPTION_ERROR";
  }
}
