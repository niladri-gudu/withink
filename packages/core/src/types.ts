import type { ResolvedPlan } from "./plans";

/**
 * Framework-neutral domain types shared by the web app, the native app, and
 * the sync API. Keep these free of Next.js, React, DOM, and Mongoose.
 */

export interface EncryptionSettings {
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
  kdfIterations: number;
}

export interface LockSettings {
  isLockEnabled: boolean;
  hasPasscode: boolean;
  autoLockTimeout: number;
  lockOnTabHide: boolean;
}

/**
 * The on-device identity. `accountId` is null for a purely local profile and
 * becomes the server user id once the profile is linked for sync.
 */
export interface LocalProfile {
  id: string;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
  encryption: EncryptionSettings;
  lock: LockSettings;
  /** Last plan seen from the server; UI-only, never authoritative. */
  lastKnownPlan: ResolvedPlan;
  planCheckedAt: string | null;
}

export interface NotebookSummary {
  id: string;
  name: string;
  isDefault: boolean;
  entryCount: number;
  /** ISO timestamp of the notebook's most recent write, or null when empty. */
  lastWrittenAt: string | null;
}
