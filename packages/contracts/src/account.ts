import { z } from "zod";

import { dateStringSchema } from "./sync";
import { unlockProofSchema } from "./unlock";

/**
 * HTTP wire shapes for the native account surface: lock, encryption, letters,
 * notifications, billing and account deletion. The Server Actions and the
 * route handlers validate with these same schemas, so a client cannot pass
 * something the other path would reject.
 */

// ---------------------------------------------------------------------------
// Lock
// ---------------------------------------------------------------------------

/** Exactly 4 to 6 numeric digits, matching the web passcode UI. */
export const passcodeSchema = z
  .string()
  .min(4, "Passcode must be at least 4 digits")
  .max(6, "Passcode cannot exceed 6 digits")
  .regex(/^\d+$/, "Passcode must contain only numbers");

export const updateLockSettingsSchema = z.object({
  isLockEnabled: z.boolean(),
  /** Present only when setting/rotating the passcode; validated when set. */
  passcode: passcodeSchema.optional(),
  autoLockTimeout: z.number().nonnegative().max(86400),
  lockOnTabHide: z.boolean(),
  /**
   * Required to DISABLE the lock, or to rotate an existing passcode: either
   * the current passcode or the master-key-derived unlock proof.
   */
  currentPasscode: passcodeSchema.optional(),
  unlockProof: unlockProofSchema.optional(),
});

export type UpdateLockSettingsRequest = z.infer<
  typeof updateLockSettingsSchema
>;

export interface LockSettingsView {
  isLockEnabled: boolean;
  hasPasscode: boolean;
  autoLockTimeout: number;
  lockOnTabHide: boolean;
  isUnlocked: boolean;
}

// ---------------------------------------------------------------------------
// Client-side encryption
// ---------------------------------------------------------------------------

const encryptionSaltSchema = z
  .string()
  .regex(/^[0-9a-f]{32}$/i, "Invalid encryption salt.");

const verificationCiphertextSchema = z
  .string()
  .min(3)
  .max(512)
  .regex(/^[0-9a-f]+:[0-9a-f]+$/i, "Invalid verification ciphertext.");

const encryptedEntrySchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(500_000),
  contentHtml: z.string().max(2_000_000),
  contentText: z.string().max(1_000_000),
  contentJson: z.string().max(2_000_000),
  wordCount: z.number().int().min(0).max(1_000_000),
});

export const enableEncryptionRequestSchema = z.object({
  action: z.literal("enable"),
  salt: encryptionSaltSchema,
  verificationCiphertext: verificationCiphertextSchema,
  /** Every existing entry, re-encrypted on the client. */
  entries: z.array(encryptedEntrySchema).max(10_000),
  unlockProof: unlockProofSchema.optional(),
  kdfIterations: z.number().int().positive().optional(),
});

export const changeDiaryPasswordRequestSchema = z.object({
  action: z.literal("change-password"),
  verificationCiphertext: verificationCiphertextSchema,
  unlockProof: unlockProofSchema,
  kdfIterations: z.number().int().positive().optional(),
});

export const encryptionMutationRequestSchema = z.discriminatedUnion("action", [
  enableEncryptionRequestSchema,
  changeDiaryPasswordRequestSchema,
]);

export type EncryptionMutationRequest = z.infer<
  typeof encryptionMutationRequestSchema
>;

export interface EncryptionSettingsView {
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
  kdfIterations: number;
}

// ---------------------------------------------------------------------------
// Letters to the future self
// ---------------------------------------------------------------------------

export const letterIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid letter.");

/** Create a draft (no `letterId`) or auto-save an existing letter. */
export const saveLetterSchema = z.object({
  letterId: letterIdSchema.optional(),
  unlockDate: dateStringSchema,
  sealed: z.boolean().optional().default(false),
  title: z
    .string()
    .max(1000, "Title cannot exceed 1000 characters.")
    .default(""),
  contentHtml: z.string().max(2_000_000).default(""),
  contentText: z.string().max(1_000_000).default(""),
  contentJson: z.any().optional(),
  wordCount: z.number().int().min(0).max(1_000_000).optional(),
});

/** Caller-facing input (defaults optional; the server applies them). */
export type SaveLetterRequest = z.input<typeof saveLetterSchema>;

/** Explicit parsed contract (zod's `z.any()` inference is too loose). */
export interface SaveLetterParsed {
  letterId?: string;
  unlockDate: string;
  sealed: boolean;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson?: unknown;
  wordCount?: number;
}

export const getLetterSchema = z.object({ letterId: letterIdSchema });

export interface LetterMeta {
  id: string;
  unlockDate: string;
  /** Ciphertext on zero-knowledge accounts; plaintext otherwise. */
  title: string;
  wordCount: number;
  sealed: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LetterFull extends LetterMeta {
  contentHtml: string;
  contentText: string;
  contentJson: unknown;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationSettingsSchema = z.object({
  dailyReminderEnabled: z.boolean(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid time."),
  letterAlertsEnabled: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});

export type NotificationSettingsRequest = z.infer<
  typeof notificationSettingsSchema
>;

export interface NotificationSettingsView {
  configured: boolean;
  publicKey: string | null;
  deviceCount: number;
  settings: NotificationSettingsRequest;
}

/** Expo Push Service tokens (never logged: they are capability tokens). */
export const expoPushTokenSchema = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/, "Invalid push token.");

export const registerPushDeviceSchema = z.object({
  token: expoPushTokenSchema,
  platform: z.enum(["ios", "android"]),
  deviceLabel: z.string().max(80).optional(),
});

export type RegisterPushDeviceRequest = z.infer<
  typeof registerPushDeviceSchema
>;

export const unregisterPushDeviceSchema = z.object({
  token: expoPushTokenSchema,
});

// ---------------------------------------------------------------------------
// Billing (read-only on native)
// ---------------------------------------------------------------------------

export interface BillingSummaryView {
  plan: "free" | "plus" | "pro";
  status: "active" | "canceled" | "past_due" | null;
  interval: "monthly" | "yearly" | null;
  currentPeriodEnd: string | null;
  /** Whether a hosted customer-portal session can be opened. */
  hasPortal: boolean;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export const deleteAccountSchema = z.object({
  /** Required for credential accounts; re-authentication before the wipe. */
  password: z.string().min(1).max(200).optional(),
});

export type DeleteAccountRequest = z.infer<typeof deleteAccountSchema>;
