/**
 * Shape of a content field encrypted by the browser's `encryptText()`
 * (`<12-byte IV as hex>:<ciphertext+tag as hex>`).
 *
 * Kept dependency-free so both client and server can import it. The server
 * uses this to refuse plaintext writes into a zero-knowledge account — the
 * client is untrusted, so "the UI always encrypts" is not a guarantee.
 */
export const CLIENT_CIPHERTEXT_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32,}$/i;

export function isClientCiphertext(value: unknown): value is string {
  return typeof value === "string" && CLIENT_CIPHERTEXT_PATTERN.test(value);
}

/**
 * True when a field is safe to persist for a client-encrypted account:
 * either empty/omitted (no content) or a valid ciphertext blob.
 */
export function isEncryptedOrEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (value === "") return true;
  if (isClientCiphertext(value)) return true;
  // Empty JSON objects were historically sent as `{}` when there was no
  // document body. They carry no plaintext, so they remain acceptable.
  if (typeof value === "object" && Object.keys(value as object).length === 0) {
    return true;
  }
  return false;
}
