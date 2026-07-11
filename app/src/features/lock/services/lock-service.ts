import { pbkdf2Sync, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { LockRepository } from "../repositories/lock-repository";
import { encrypt, decrypt } from "@/lib/encryption";
import { getCachedValue, setCachedValue, redis } from "@/lib/redis";
import { resend } from "@/lib/email";
import { logger } from "@/server/logger";
import { env } from "@/config/env";
import { auth } from "@/lib/auth";

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
    const hash = pbkdf2Sync(passcode, salt, 10000, 64, "sha256").toString("hex");
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
      const testHash = pbkdf2Sync(passcode, salt, 10000, 64, "sha256").toString("hex");
      return hash === testHash;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the user's session is currently unlocked by verifying the unlock cookie.
   */
  static async isSessionUnlocked(userId: string): Promise<boolean> {
    const settings = await LockRepository.getSettings(userId);
    // If lock is disabled, user is unlocked by default
    if (!settings || !settings.isLockEnabled) {
      return true;
    }

    const cookieStore = await cookies();
    const cookie = cookieStore.get(UNLOCKED_COOKIE_NAME);
    if (!cookie || !cookie.value) {
      return false;
    }

    try {
      const decrypted = decrypt(cookie.value);
      if (decrypted === "DECRYPTION_ERROR") return false;
      const token = JSON.parse(decrypted) as UnlockToken;
      if (token.userId !== userId) return false;
      if (Date.now() > token.expiresAt) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sets the unlocked HTTP-only secure cookie for the user.
   */
  static async setUnlockCookie(userId: string, durationSeconds: number = 28800): Promise<void> {
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
   * Verifies the user's account password.
   */
  static async verifyLoginPassword(email: string, password: string): Promise<boolean> {
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
  static async sendResetEmail(userId: string, email: string, name: string): Promise<boolean> {
    if (!redis) return false;

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `lock:reset:${userId}`;
    
    await setCachedValue(cacheKey, code, RESET_CODE_TTL_SECONDS);

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Reset your diary passcode - withink.",
        html: `
          <div style="font-family: ui-monospace, monospace; background-color: #020617; color: #e4e4e7; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 40px;">
              <div style="margin-bottom: 32px;">
                <span style="font-size: 22px; font-weight: 900; color: #f4f4f5; letter-spacing: -1px;">withink.</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 700; color: #f4f4f5; margin: 0 0 8px 0; letter-spacing: -0.5px;">Reset your diary passcode</h1>
              <p style="font-size: 15px; color: #a1a1aa; margin: 0 0 32px 0; lineHeight: 1.6;">
                Hey ${name}, we received a request to reset the passcode lock for your diary. Use the code below to reset your lock:
              </p>
              <div style="display: inline-block; background-color: #1e1b4b; border: 1px solid #4f46e5; color: #e0e7ff; font-weight: 700; font-size: 28px; padding: 12px 28px; border-radius: 10px; letter-spacing: 4px; text-align: center; margin-bottom: 32px;">
                ${code}
              </div>
              <div style="border-top: 1px solid #27272a; margin: 32px 0;"></div>
              <p style="font-size: 12px; color: #52525b; margin: 0;">
                This code expires in 15 minutes. If you did not make this request, you can ignore this email.
              </p>
            </div>
          </div>
        `,
      });
      logger.info("Passcode reset email sent", { email });
      return true;
    } catch (error) {
      logger.error("Failed to send passcode reset email", error as Error, { email });
      return false;
    }
  }

  /**
   * Verifies the email reset code and disables lock settings.
   */
  static async verifyResetCodeAndDisable(userId: string, code: string): Promise<boolean> {
    if (!redis) return false;
    
    const cacheKey = `lock:reset:${userId}`;
    const storedCode = await getCachedValue<string>(cacheKey);

    if (!storedCode || String(storedCode) !== String(code)) {
      return false;
    }

    // Passcode verified, disable lock settings
    await LockRepository.saveSettings(userId, {
      isLockEnabled: false,
      passcodeHash: "",
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
}
