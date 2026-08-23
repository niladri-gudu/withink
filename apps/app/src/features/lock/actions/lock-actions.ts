"use server";

import { z } from "zod";

import { redis } from "@/lib/redis";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";

import { LockRepository } from "../repositories/lock-repository";
import { LockService } from "../services/lock-service";
import {
  passcodeSchema,
  updateLockSettingsSchema,
} from "../validation/lock-schema";

/**
 * Gets the current user's lock settings configuration
 */
export async function getLockSettingsAction(): Promise<{
  success: boolean;
  data?: {
    isLockEnabled: boolean;
    hasPasscode: boolean;
    autoLockTimeout: number;
    lockOnTabHide: boolean;
    isUnlocked: boolean;
  };
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const settings = await LockRepository.getSettings(session.user.id);
    // Read-only: do not extend the unlock cookie when polling settings for UI state.
    const isUnlocked = await LockService.isSessionUnlocked(
      session.user.id,
      true,
    );

    return {
      success: true,
      data: {
        isLockEnabled: settings?.isLockEnabled ?? false,
        hasPasscode: !!settings?.passcodeHash,
        autoLockTimeout: settings?.autoLockTimeout ?? 300,
        lockOnTabHide: settings?.lockOnTabHide ?? false,
        isUnlocked,
      },
    };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Validates the passcode and unlocks the session
 */
export async function unlockAction(
  passcode: string,
  unlockProof?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input PIN format
    passcodeSchema.parse(passcode);

    const settings = await LockRepository.getSettings(session.user.id);
    if (!settings || !settings.isLockEnabled) {
      return { success: true }; // already unlocked or disabled
    }

    // Rate limit only failed passcode attempts (10 per 5 minutes per user).
    // Check AFTER verifying passcode so successful unlocks don't burn tokens.
    const verified = LockService.verifyPasscode(
      passcode,
      settings.passcodeHash,
    );
    if (!verified) {
      const limit = await rateLimit(`lock:unlock-failed:${session.user.id}`, {
        limit: 10,
        windowSeconds: 300,
      });
      if (!limit.success) {
        return {
          success: false,
          error: "Too many failed attempts. Please try again in 5 minutes.",
        };
      }
      return { success: false, error: "Incorrect passcode" };
    }

    // Passcode correct — clear any failed-attempt counter so the user starts fresh
    if (redis) {
      try {
        await redis.del(`ratelimit:lock:unlock-failed:${session.user.id}`);
      } catch {
        // best-effort cleanup
      }
    }

    // The client proved possession of the master key locally (the PIN unwrap
    // succeeded), so it can supply the derived unlock proof. Binding/updating
    // it here is safe: the passcode was just verified against the stored hash.
    if (
      typeof unlockProof === "string" &&
      /^[0-9a-fA-F]{64}$/.test(unlockProof)
    ) {
      try {
        await LockRepository.saveSettings(session.user.id, {
          unlockProofHash: LockService.hashUnlockProof(unlockProof),
        });
      } catch {
        // Best-effort binding; the unlock itself still succeeds.
      }
    }

    // Set cookie token
    const timeout =
      settings.autoLockTimeout > 0 ? settings.autoLockTimeout : 28800; // 8 hrs if timeout is 0
    await LockService.setUnlockCookie(session.user.id, timeout);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: err.errors[0]?.message || "Validation failed",
      };
    }
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Clears the unlock cookie, locking the user session
 */
export async function lockAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await LockService.clearUnlockCookie();
    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Saves or updates user lock settings
 */
export async function saveLockSettingsAction(
  inputData: unknown,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = updateLockSettingsSchema.parse(inputData);
    const existing = await LockRepository.getSettings(session.user.id);

    // Proof-of-knowledge checks. Strict: the proof must already be bound and
    // match — binding only happens where knowledge is proven another way
    // (passcode verification in unlockAction, or at encryption setup).
    const passcodeOk =
      !!validated.currentPasscode &&
      !!existing?.passcodeHash &&
      LockService.verifyPasscode(
        validated.currentPasscode,
        existing.passcodeHash,
      );
    const proofOk =
      !!validated.unlockProof &&
      !!existing?.unlockProofHash &&
      LockService.verifyUnlockProofHash(
        validated.unlockProof,
        existing.unlockProofHash,
      );

    // PRIVILEGED TRANSITIONS require proof that the caller knows a secret:
    //  - disabling an enabled lock (else any session could strip it), and
    //  - enabling when a passcode already exists — this covers rotating the
    //    passcode (else an attacker could replace it with their own) AND
    //    re-enabling without setting a new secret (which would mint an
    //    unlock cookie without any secret check).
    // First-time setup (no stored passcode) is exempt: the caller defines
    // the secret.
    const privileged =
      (!!existing?.isLockEnabled && !validated.isLockEnabled) ||
      (validated.isLockEnabled && !!existing?.passcodeHash);
    if (privileged && !passcodeOk && !proofOk) {
      return {
        success: false,
        error:
          "Verify your identity to change the diary lock. Unlock your diary first, then try again.",
      };
    }

    const updatePayload: Record<string, unknown> = {
      isLockEnabled: validated.isLockEnabled,
      autoLockTimeout: validated.autoLockTimeout,
      lockOnTabHide: validated.lockOnTabHide,
    };

    if (validated.isLockEnabled) {
      if (validated.passcode) {
        // Hashing new passcode
        passcodeSchema.parse(validated.passcode);
        updatePayload.passcodeHash = LockService.hashPasscode(
          validated.passcode,
        );
        // First-time setup can bind the unlock proof right away (the caller
        // holds the master key while unlocked).
        if (
          !existing?.unlockProofHash &&
          typeof validated.unlockProof === "string" &&
          /^[0-9a-fA-F]{64}$/.test(validated.unlockProof)
        ) {
          updatePayload.unlockProofHash = LockService.hashUnlockProof(
            validated.unlockProof,
          );
        }
      } else if (!existing || !existing.passcodeHash) {
        return {
          success: false,
          error: "A passcode is required to enable diary lock",
        };
      }
    }
    // Disabling the lock is per-device: the account's passcode hash is kept so
    // other devices that still have the lock enabled keep working.

    await LockRepository.saveSettings(session.user.id, updatePayload);

    if (validated.isLockEnabled) {
      // Auto-unlock current action setter session
      const timeout =
        validated.autoLockTimeout > 0 ? validated.autoLockTimeout : 28800;
      await LockService.setUnlockCookie(session.user.id, timeout);
    } else {
      await LockService.clearUnlockCookie();
    }

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: err.errors[0]?.message || "Validation failed",
      };
    }
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Sends a recovery email with a 6-digit verification code to reset the lock
 */
export async function requestPasscodeResetEmailAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Apply rate limiting (3 reset emails per 15 minutes per user) to prevent email bombing
    const limit = await rateLimit(
      `lock:request-reset-email:${session.user.id}`,
      {
        limit: 3,
        windowSeconds: 900,
      },
    );
    if (!limit.success) {
      return {
        success: false,
        error: "Too many reset requests. Please try again later.",
      };
    }

    const sent = await LockService.sendResetEmail(
      session.user.id,
      session.user.email,
      session.user.name,
    );

    if (!sent) {
      return {
        success: false,
        error: "Failed to send reset email. Please try again later.",
      };
    }

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Verifies the 6-digit recovery code and disables the lock settings
 */
export async function verifyPasscodeResetCodeAction(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Apply rate limiting (5 attempts per 15 minutes per user)
    const limit = await rateLimit(`lock:verify-reset-code:${session.user.id}`, {
      limit: 5,
      windowSeconds: 900,
    });
    if (!limit.success) {
      return {
        success: false,
        error:
          "Too many verification attempts. Please try again in 15 minutes.",
      };
    }

    const disabled = await LockService.verifyResetCodeAndDisable(
      session.user.id,
      code,
    );
    if (!disabled) {
      return { success: false, error: "Invalid or expired recovery code" };
    }

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Resets the lock using the user's login password (for credentials users)
 */
export async function verifyPasswordAndResetLockAction(
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Apply rate limiting (5 attempts per 5 minutes per user)
    const limit = await rateLimit(`lock:verify-password:${session.user.id}`, {
      limit: 5,
      windowSeconds: 300,
    });
    if (!limit.success) {
      return {
        success: false,
        error:
          "Too many password verification attempts. Please try again in 5 minutes.",
      };
    }

    const verified = await LockService.verifyLoginPassword(
      session.user.email,
      password,
    );
    if (!verified) {
      return { success: false, error: "Incorrect password" };
    }

    // Disable lock
    await LockRepository.saveSettings(session.user.id, {
      isLockEnabled: false,
      passcodeHash: "",
      unlockProofHash: "",
    });

    await LockService.clearUnlockCookie();

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Unlocks the session on the server side (sets the unlock cookie).
 *
 * Requires an unlock proof: a subkey derived client-side from the diary
 * master key (HKDF, never used for content). The client can only produce it
 * after actually decrypting the master key, so the unlock cookie cannot be
 * minted by an authenticated session that doesn't hold the key. The proof is
 * verified against its stored sha256 hash; accounts without a bound hash yet
 * bind on first use (migration for pre-existing diaries).
 */
export async function unlockSessionAction(proof: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate the proof shape: exactly 32 bytes as 64 hex chars.
    if (typeof proof !== "string" || !/^[0-9a-fA-F]{64}$/.test(proof)) {
      return { success: false, error: "Invalid unlock proof." };
    }

    const settings = await LockRepository.getSettings(session.user.id);
    const timeout =
      settings?.autoLockTimeout && settings.autoLockTimeout > 0
        ? settings.autoLockTimeout
        : 28800;

    // Strict verification: the proof must already be bound and match. Binding
    // happens at encryption setup, at first-time passcode setup, or during
    // unlockAction (where the passcode is verified server-side). An unbound
    // hash can never mint a cookie — the client instead routes the user
    // through the one-time email-code binding flow below.
    if (!settings?.unlockProofHash) {
      return { success: false, error: "UNLOCK_PROOF_NOT_BOUND" };
    }
    if (!LockService.verifyUnlockProofHash(proof, settings.unlockProofHash)) {
      // Rate limit failed proofs so the action can't be hammered.
      const limit = await rateLimit(`lock:unlock-proof:${session.user.id}`, {
        limit: 10,
        windowSeconds: 300,
      });
      if (!limit.success) {
        return {
          success: false,
          error: "Too many failed attempts. Please try again in 5 minutes.",
        };
      }
      return { success: false, error: "Unlock verification failed." };
    }

    await LockService.setUnlockCookie(session.user.id, timeout);

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * One-time migration for accounts that enabled zero-knowledge encryption
 * before unlock-proof binding existed. Verifies an email reset code (proof
 * of mailbox ownership) and binds the client-derived unlock proof, then
 * mints the unlock cookie. Refuses when a proof is already bound.
 */
export async function bindUnlockProofWithCodeAction(
  code: string,
  proof: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const limit = await rateLimit(`lock:bind-proof:${session.user.id}`, {
      limit: 5,
      windowSeconds: 900,
    });
    if (!limit.success) {
      return {
        success: false,
        error: "Too many attempts. Please try again in 15 minutes.",
      };
    }

    if (typeof proof !== "string" || !/^[0-9a-fA-F]{64}$/.test(proof)) {
      return { success: false, error: "Invalid unlock proof." };
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return {
        success: false,
        error: "Enter the 6-digit code from your email.",
      };
    }

    const settings = await LockRepository.getSettings(session.user.id);
    if (settings?.unlockProofHash) {
      return { success: false, error: "Unlock proof is already bound." };
    }

    const bound = await LockService.verifyResetCodeAndBindProof(
      session.user.id,
      code,
      proof,
    );
    if (!bound) {
      return { success: false, error: "Invalid or expired code." };
    }

    const timeout =
      settings?.autoLockTimeout && settings.autoLockTimeout > 0
        ? settings.autoLockTimeout
        : 28800;
    await LockService.setUnlockCookie(session.user.id, timeout);

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
