import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  decryptText,
  deriveKeyFromPassword,
  deriveUnlockProofHex,
  encryptText,
  exportKeyToHex,
  importKeyFromHex,
  webCryptoProvider,
} from "./crypto-client";

/**
 * Cross-implementation fixtures. These must hold for any client that claims
 * to read Withink diaries; the native crypto adapter is validated against the
 * same vectors.
 */
const KEY_HEX =
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const IV_HEX = "000102030405060708090a0b";
const PLAINTEXT = "Withink golden vector v1";
const CIPHERTEXT_HEX =
  "106ba273ac8ba93bea2efbefd487581be6b5f35b825b294d2d6e38e4953c0f01d2c127c64af1fa2b";
const PBKDF2_PASSWORD = "correct horse battery staple";
const PBKDF2_SALT = "00112233445566778899aabbccddeeff";
const PBKDF2_ITERATIONS = 1000;
const PBKDF2_KEY_HEX =
  "dfb233c3b5065575ef404328c881a0cba71b7180f72298a2edc5ea5f3a4c02f9";
const UNLOCK_PROOF_HEX =
  "1465f9bdb9c9f00d5eea7e3c4470e30650f9dad51bf750bbf6238a9670cd3cc8";

beforeAll(() => {
  // jsdom exposes crypto but not SubtleCrypto; the production code uses
  // globalThis.crypto.subtle, so bind Node's WebCrypto for these vectors.
  vi.stubGlobal("crypto", webcrypto);
});

describe("crypto-client golden vectors", () => {
  it("decrypts the fixed AES-GCM iv:ciphertext vector", async () => {
    const key = await importKeyFromHex(KEY_HEX);
    await expect(decryptText(`${IV_HEX}:${CIPHERTEXT_HEX}`, key)).resolves.toBe(
      PLAINTEXT,
    );
  });

  it("exports and re-imports the same master key bytes", async () => {
    const key = await importKeyFromHex(KEY_HEX);
    await expect(exportKeyToHex(key)).resolves.toBe(KEY_HEX);
  });

  it("derives the same unlock proof as the fixture", async () => {
    const key = await importKeyFromHex(KEY_HEX);
    await expect(deriveUnlockProofHex(key)).resolves.toBe(UNLOCK_PROOF_HEX);
  });

  it("derives the same key from password, salt and iterations", async () => {
    const key = await deriveKeyFromPassword(
      PBKDF2_PASSWORD,
      PBKDF2_SALT,
      PBKDF2_ITERATIONS,
    );
    await expect(exportKeyToHex(key)).resolves.toBe(PBKDF2_KEY_HEX);
  });

  it("round-trips plaintext with a random IV", async () => {
    const key = await importKeyFromHex(KEY_HEX);
    const ciphertext = await encryptText(PLAINTEXT, key);
    expect(ciphertext).toMatch(/^[0-9a-f]{24}:[0-9a-f]+$/);
    expect(ciphertext).not.toContain(PLAINTEXT);
    await expect(decryptText(ciphertext, key)).resolves.toBe(PLAINTEXT);
  });

  it("passes through legacy plaintext without a colon", async () => {
    const key = await importKeyFromHex(KEY_HEX);
    await expect(decryptText("legacy plaintext", key)).resolves.toBe(
      "legacy plaintext",
    );
  });

  it("exposes the same implementation through the shared interface", () => {
    expect(webCryptoProvider.encryptText).toBe(encryptText);
    expect(webCryptoProvider.decryptText).toBe(decryptText);
    expect(webCryptoProvider.deriveUnlockProofHex).toBe(deriveUnlockProofHex);
  });
});
