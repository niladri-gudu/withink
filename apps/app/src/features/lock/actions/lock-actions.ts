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
      } else if (!existing || !existing.passcodeHash) {
        return {
          success: false,
          error: "A passcode is required to enable diary lock",
        };
      }
    } else {
      // Disabling lock, clean up passcode hash
      updatePayload.passcodeHash = "";
    }

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
 * Used when the client successfully decrypts the master key using the master password.
 */
export async function unlockSessionAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const settings = await LockRepository.getSettings(session.user.id);
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
