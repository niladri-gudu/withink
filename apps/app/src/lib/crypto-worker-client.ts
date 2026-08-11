import { deriveKeyFromPassword } from "./crypto-client";

/**
 * Derives a CryptoKey from a password and salt.
 * Uses main-thread derivation for reliability.
 */
export async function deriveKeyFromPasswordAsync(
  password: string,
  saltHex: string,
  iterations = 100000,
): Promise<CryptoKey> {
  return await deriveKeyFromPassword(password, saltHex, iterations);
}
