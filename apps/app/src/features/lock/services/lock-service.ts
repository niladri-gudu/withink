import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";

import { env } from "@/config/env";
import { auth } from "@/lib/auth";
import { resend } from "@/lib/email";
import { decryptToken, encrypt } from "@/lib/encryption";
import { getCachedValue, redis, setCachedValue } from "@/lib/redis";
import { logger } from "@/server/logger";

import { ResetPasscode } from "../components/emails/reset-passcode";
import { LockRepository } from "../repositories/lock-repository";

const UNLOCKED_COOKIE_NAME = "withink-unlocked";
const RESET_CODE_TTL_SECONDS = 900; // 15 minutes

interface UnlockToken {
  userId: string;
  expiresAt: number;
}

export class LockService {
  /**
   * Hashes a passcode using pbkdf2 with a random salt.
   */
  static hashPasscode(passcode: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(passcode, salt, 10000, 64, "sha256").toString(
      "hex",
    );
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a passcode against its stored pbkdf2 hash.
   */
  static verifyPasscode(passcode: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(":")) return false;
    try {
      const [salt, hash] = storedHash.split(":");
      if (!salt || !hash) return false;
      const testHash = pbkdf2Sync(passcode, salt, 10000, 64, "sha256").toString(
        "hex",
      );
      const expected = Buffer.from(hash, "hex");
      const actual = Buffer.from(testHash, "hex");
      if (expected.length !== actual.length) return false;
      return timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  /**
   * Hashes an unlock proof (client-derived HKDF subkey hex) with sha256.
   * The server only ever stores this hash — never the proof itself.
   */
  static hashUnlockProof(proof: string): string {
    return createHash("sha256").update(proof, "utf8").digest("hex");
  }

  /**
   * Verifies a submitted unlock proof against its stored sha256 hash.
   * Timing-safe to prevent byte-by-byte recovery of the hash.
   */
  static verifyUnlockProofHash(proof: string, storedHash: string): boolean {
    if (!storedHash) return false;
    try {
      const expected = Buffer.from(storedHash, "hex");
      const actual = Buffer.from(this.hashUnlockProof(proof), "hex");
      if (expected.length !== actual.length) return false;
      return timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  /**
   * Checks if the user's session is currently unlocked by verifying the unlock cookie.
   *
   * @param settings Optional pre-fetched lock settings. Callers that already
   *   read the settings (e.g. the app layout) pass them in to avoid a second
   *   Redis round trip; the value comes from a per-request cache.
   */
  static async isSessionUnlocked(
    userId: string,
    readonly = false,
    settings?: Awaited<ReturnType<typeof LockRepository.getSettings>>,
  ): Promise<boolean> {
    const resolvedSettings =
      settings ?? (await LockRepository.getSettings(userId));
    // If lock is disabled, user is unlocked by default
    if (!resolvedSettings || !resolvedSettings.isLockEnabled) {
      return true;
    }

    const cookieStore = await cookies();
    const cookie = cookieStore.get(UNLOCKED_COOKIE_NAME);
    if (!cookie || !cookie.value) {
      return false;
    }

    try {
      const decrypted = decryptToken(cookie.value);
      const token = JSON.parse(decrypted) as UnlockToken;
      if (token.userId !== userId) return false;
      if (Date.now() > token.expiresAt) return false;

      // Sliding session window: renew the cookie expiration on active verify
      // check, but only once more than half the window has elapsed. Hot read
      // paths (every autosave / list fetch) call this on each request; re-setting
      // the cookie each time means needless response-cookie writes on a tight
      // loop. Half-window granularity keeps the session alive without the churn.
      if (!readonly) {
        try {
          const timeout =
            resolvedSettings.autoLockTimeout > 0
              ? resolvedSettings.autoLockTimeout
              : 28800;
          const remaining = token.expiresAt - Date.now();
          if (remaining <= (timeout * 1000) / 2) {
            await this.setUnlockCookie(userId, timeout);
          }
        } catch (cookieErr) {
          // Safe fallback if called in a read-only request context (e.g. Server Component renders)
          logger.warn(
            "Failed to slide lock session cookie",
            undefined,
            cookieErr as Error,
          );
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sets the unlocked HTTP-only secure cookie for the user.
   */
  static async setUnlockCookie(
    userId: string,
    durationSeconds: number = 28800,
  ): Promise<void> {
    const token: UnlockToken = {
      userId,
      expiresAt: Date.now() + durationSeconds * 1000,
    };

    const encryptedToken = encrypt(JSON.stringify(token));
    const cookieStore = await cookies();

    cookieStore.set(UNLOCKED_COOKIE_NAME, encryptedToken, {
      httpOnly: true,
      secure: env.IS_PROD,
      sameSite: "lax",
      maxAge: durationSeconds,
      path: "/",
    });
  }

  /**
   * Clears the unlock cookie.
   */
  static async clearUnlockCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(UNLOCKED_COOKIE_NAME);
  }

  /**
   * Constant-time string comparison for equal-length secrets.
   */
  private static timingSafeStringEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
    } catch {
      return false;
    }
  }

  /**
   * Verifies the user's account password.
   */
  static async verifyLoginPassword(
    email: string,
    password: string,
  ): Promise<boolean> {
    try {
      const result = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });
      return !!result;
    } catch (err) {
      logger.error("Failed password verification", err as Error, { email });
      return false;
    }
  }

  /**
   * Generates a 6-digit reset code and emails it to the user.
   */
  static async sendResetEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<boolean> {
    if (!redis) return false;

    // Generate random 6-digit code using a CSPRNG
    const code = randomInt(100000, 1000000).toString();
    const cacheKey = `lock:reset:${userId}`;

    await setCachedValue(cacheKey, code, RESET_CODE_TTL_SECONDS);

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Passcode reset code · withink.",
        react: ResetPasscode({ name, code }),
        text:
          `Hey ${name},\n\n` +
          "Use this code to reset the passcode protecting your diary:\n\n" +
          `${code}\n\n` +
          "This code expires in 15 minutes. If you didn't request this, " +
          "nothing changes — your passcode stays exactly as it was.\n",
      });
      logger.info("Passcode reset email sent", { email });
      return true;
    } catch (error) {
      logger.error("Failed to send passcode reset email", error as Error, {
        email,
      });
      return false;
    }
  }

  /**
   * Verifies the email reset code and disables lock settings.
   */
  static async verifyResetCodeAndDisable(
    userId: string,
    code: string,
  ): Promise<boolean> {
    if (!redis) return false;

    const cacheKey = `lock:reset:${userId}`;
    const storedCode = await getCachedValue<string>(cacheKey);

    // Timing-safe comparison — passcodes already use timingSafeEqual, so the
    // 6-digit reset path shouldn't be a softer target.
    if (
      !storedCode ||
      !this.timingSafeStringEqual(String(storedCode), String(code))
    ) {
      return false;
    }

    // Passcode verified, disable lock settings
    await LockRepository.saveSettings(userId, {
      isLockEnabled: false,
      passcodeHash: "",
      unlockProofHash: "",
    });

    // Clear reset code from Redis
    try {
      await redis.del(cacheKey);
    } catch {
      // ignore
    }

    // Clear any existing cookie
    await this.clearUnlockCookie();

    return true;
  }

  /**
   * One-time migration for pre-existing zero-knowledge accounts: verifies the
   * email reset code and binds the supplied unlock proof (whose sha256 the
   * server stores). The email channel is what makes this safe — an attacker
   * with only the login session cannot read the victim's inbox. The proof
   * itself can only be produced by someone holding the master key.
   */
  static async verifyResetCodeAndBindProof(
    userId: string,
    code: string,
    proof: string,
  ): Promise<boolean> {
    if (!redis) return false;

    if (typeof proof !== "string" || !/^[0-9a-fA-F]{64}$/.test(proof)) {
      return false;
    }

    const cacheKey = `lock:reset:${userId}`;
    const storedCode = await getCachedValue<string>(cacheKey);

    if (
      !storedCode ||
      !this.timingSafeStringEqual(String(storedCode), String(code))
    ) {
      return false;
    }

    await LockRepository.saveSettings(userId, {
      unlockProofHash: this.hashUnlockProof(proof),
    });

    try {
      await redis.del(cacheKey);
    } catch {
      // ignore
    }

    return true;
  }
}
