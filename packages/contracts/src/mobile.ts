import type { EncryptionSettings, LockSettings } from "@withink/core";

/**
 * Everything a native client needs before it can unlock the diary.
 *
 * Deliberately excludes passcode hashes and the unlock-proof hash: those stay
 * server-side. The native client derives the master key from the salt and
 * verification ciphertext, then exchanges the HKDF proof for `/api/unlock`.
 */
export interface MobileBootstrap {
  user: {
    id: string;
    name: string;
    email: string;
  };
  encryption: Pick<
    EncryptionSettings,
    | "isClientEncrypted"
    | "encryptionSalt"
    | "verificationCiphertext"
    | "kdfIterations"
  >;
  lock: Pick<LockSettings, "isLockEnabled" | "autoLockTimeout" | "hasPasscode">;
}
