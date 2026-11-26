import "server-only";

import { decryptToken, encrypt } from "@/lib/encryption";

/**
 * Short-lived unlock credentials.
 *
 * The web stores this payload in the HttpOnly `withink-unlocked` cookie.
 * Native clients cannot use that cookie, so `/api/unlock` returns the same
 * encrypted payload as a bearer-style token for `X-Withink-Unlock`. One
 * format, one verification path.
 */

export interface UnlockTokenPayload {
  userId: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

/** Native tokens are deliberately shorter than the web's 8-hour cookie. */
export const UNLOCK_TOKEN_TTL_SECONDS = 15 * 60;

export function mintUnlockToken(
  userId: string,
  durationSeconds: number = UNLOCK_TOKEN_TTL_SECONDS,
): { token: string; expiresAt: number } {
  const bounded = Math.max(1, Math.floor(durationSeconds));
  const expiresAt = Date.now() + bounded * 1000;
  const token = encrypt(
    JSON.stringify({ userId, expiresAt } satisfies UnlockTokenPayload),
  );
  return { token, expiresAt };
}

export function parseUnlockToken(token: string): UnlockTokenPayload | null {
  try {
    const parsed = JSON.parse(
      decryptToken(token),
    ) as Partial<UnlockTokenPayload>;
    if (typeof parsed.userId !== "string" || parsed.userId.length === 0) {
      return null;
    }
    if (
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }
    return { userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function verifyUnlockToken(
  token: string,
  userId: string,
  now: number = Date.now(),
): boolean {
  const parsed = parseUnlockToken(token);
  return parsed !== null && parsed.userId === userId && now <= parsed.expiresAt;
}
