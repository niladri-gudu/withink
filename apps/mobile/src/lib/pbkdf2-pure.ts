import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { hexToBytes } from "@withink/core/encoding";

/**
 * Portable PBKDF2 fallback. Correct but slow on Hermes at production
 * iteration counts; native platforms use the WebView/WebCrypto bridge first.
 */
export async function deriveKeyFromPasswordImpl(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<Uint8Array> {
  return await pbkdf2Async(
    sha256,
    utf8ToBytes(password),
    hexToBytes(saltHex),
    { c: iterations, dkLen: 32 },
  );
}
