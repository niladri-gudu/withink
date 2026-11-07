/**
 * PBKDF2 iteration policy for client-side key derivation.
 *
 * The iteration count is stored per account (`kdfIterations`) so existing
 * accounts keep unlocking with their original count while new setups use the
 * stronger value. Never raise the constant without keeping the stored value
 * authoritative for accounts that already exist.
 */
export const KDF_ITERATIONS = 600_000;
export const LEGACY_KDF_ITERATIONS = 100_000;

/** PIN fast-path. New blobs use the higher count; the reader falls back to
 *  the legacy 50k so an existing device is never locked out after upgrade. */
export const PIN_KDF_ITERATIONS = 210_000;
export const LEGACY_PIN_KDF_ITERATIONS = 50_000;

/** Clamp an untrusted iteration value to a sane, supported range. */
export function normalizeKdfIterations(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return LEGACY_KDF_ITERATIONS;
  }
  return Math.min(Math.max(value, LEGACY_KDF_ITERATIONS), 2_000_000);
}
