import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { bytesToHex, hexToBytes } from "@withink/core/encoding";
import type { CryptoProvider } from "@withink/core/crypto";
import * as Crypto from "expo-crypto";

import { deriveKeyFromPasswordImpl } from "./pbkdf2";

/**
 * Byte-compatible native implementation of the web crypto surface.
 *
 * Pure-JS primitives (audited noble libraries) so the client runs in Expo Go.
 * A later slice swaps this adapter for a native module
 * (`react-native-quick-crypto`) once a development build replaces Expo Go; the
 * goldens below pin the format.
 *
 * Format: AES-256-GCM, 12-byte IV, output `ivHex:ciphertextHex` where the
 * ciphertext includes the 16-byte tag — identical to WebCrypto.
 */

export type MasterKey = Uint8Array;

const UNLOCK_INFO = utf8ToBytes("withink-unlock-proof-v1");
const IV_BYTES = 12;

/** Minimal UTF-8 decoder (Hermes has no TextDecoder); handles surrogate pairs. */
function bytesToUtf8(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; ) {
    const first = bytes[i++]!;
    if (first < 0x80) {
      result += String.fromCharCode(first);
    } else if (first < 0xe0) {
      const second = bytes[i++]!;
      result += String.fromCharCode(
        ((first & 0x1f) << 6) | (second & 0x3f),
      );
    } else if (first < 0xf0) {
      const second = bytes[i++]!;
      const third = bytes[i++]!;
      result += String.fromCharCode(
        ((first & 0x0f) << 12) |
          ((second & 0x3f) << 6) |
          (third & 0x3f),
      );
    } else {
      const second = bytes[i++]!;
      const third = bytes[i++]!;
      const fourth = bytes[i++]!;
      const codePoint =
        ((first & 0x07) << 18) |
        ((second & 0x3f) << 12) |
        ((third & 0x3f) << 6) |
        (fourth & 0x3f);
      const offset = codePoint - 0x10000;
      result += String.fromCharCode(
        0xd800 + (offset >> 10),
        0xdc00 + (offset & 0x3ff),
      );
    }
  }
  return result;
}

export async function deriveKeyFromPassword(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<MasterKey> {
  return await deriveKeyFromPasswordImpl(password, saltHex, iterations);
}

export async function generateMasterKey(): Promise<MasterKey> {
  return Crypto.getRandomBytes(32);
}

export async function importKeyFromHex(hex: string): Promise<MasterKey> {
  return hexToBytes(hex);
}

export async function exportKeyToHex(key: MasterKey): Promise<string> {
  return bytesToHex(key);
}

export async function encryptText(
  plaintext: string,
  key: MasterKey,
): Promise<string> {
  const iv = Crypto.getRandomBytes(IV_BYTES);
  const ciphertext = gcm(key, iv).encrypt(utf8ToBytes(plaintext));
  return `${bytesToHex(iv)}:${bytesToHex(ciphertext)}`;
}

export async function decryptText(
  encryptedData: string,
  key: MasterKey,
): Promise<string> {
  if (!encryptedData || !encryptedData.includes(":")) {
    return encryptedData;
  }

  const [ivHex, ciphertextHex] = encryptedData.split(":");
  if (!ivHex || !ciphertextHex) {
    return encryptedData;
  }

  const plaintext = gcm(key, hexToBytes(ivHex)).decrypt(
    hexToBytes(ciphertextHex),
  );
  return bytesToUtf8(plaintext);
}

export async function deriveUnlockProofHex(key: MasterKey): Promise<string> {
  return bytesToHex(hkdf(sha256, key, new Uint8Array(0), UNLOCK_INFO, 32));
}

export const mobileCrypto: CryptoProvider<MasterKey> = {
  generateMasterKey,
  importKeyFromHex,
  exportKeyToHex,
  deriveKeyFromPassword,
  deriveUnlockProofHex,
  encryptText,
  decryptText,
};
