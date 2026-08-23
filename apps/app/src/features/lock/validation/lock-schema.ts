import { z } from "zod";

// Validates that the passcode is exactly 4 to 6 numeric digits
export const passcodeSchema = z
  .string()
  .min(4, "Passcode must be at least 4 digits")
  .max(6, "Passcode cannot exceed 6 digits")
  .regex(/^\d+$/, "Passcode must contain only numbers");

// Validates that a hex string is exactly 64 characters (32 bytes) — the shape
// of the client-derived unlock proof subkey.
const hexProofSchema = z.string().regex(/^[0-9a-fA-F]{64}$/, "Invalid proof");

// Schema for updating lock configurations
export const updateLockSettingsSchema = z.object({
  isLockEnabled: z.boolean(),
  passcode: z.string().optional(),
  autoLockTimeout: z.number().nonnegative().max(86400),
  lockOnTabHide: z.boolean(),
  // Required to DISABLE the lock: either the current passcode or the
  // unlock-proof subkey derived from the master key. Without one of these,
  // any authenticated session could strip the account's lock.
  currentPasscode: passcodeSchema.optional(),
  unlockProof: hexProofSchema.optional(),
});
