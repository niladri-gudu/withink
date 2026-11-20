import type {
  EncryptionSettings,
  LocalProfile,
  LocalUserHint,
  LockSettings,
} from "@withink/core";

import { diaryCacheDB } from "@/lib/diary-cache-db";

const DEFAULT_PROFILE_ID = "local";
export const ZK_HINT_COOKIE = "withink-zk";

export async function readLocalProfile(): Promise<LocalProfile | null> {
  return await diaryCacheDB.getProfile();
}

/**
 * Merges the authoritative server settings into the local profile. The server
 * remains the source of truth; this record is the on-device cache that lets a
 * future boot decide the encryption/lock gate without a network read.
 */
export async function seedLocalProfile(input: {
  accountId: string | null;
  user: LocalUserHint | null;
  encryption: EncryptionSettings;
  lock: LockSettings;
}): Promise<LocalProfile> {
  const existing = await diaryCacheDB.getProfile();
  const now = new Date().toISOString();

  const profile: LocalProfile = {
    id: existing?.id ?? DEFAULT_PROFILE_ID,
    accountId: input.accountId ?? existing?.accountId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    encryption: input.encryption,
    lock: input.lock,
    user: input.user ?? existing?.user ?? null,
    lastKnownPlan: existing?.lastKnownPlan ?? "free",
    planCheckedAt: existing?.planCheckedAt ?? null,
  };

  await diaryCacheDB.putProfile(profile);
  return profile;
}

/**
 * Non-sensitive hint the server layout can read (E4b) to know this browser
 * belongs to a zero-knowledge account whose streamed RSC content is
 * ciphertext. It is never used for authorization. The value is the account id
 * so a different account signing in on the same browser can detect the stale
 * hint and fall back to the server gate.
 */
export function setZkHintCookie(accountId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ZK_HINT_COOKIE}=${encodeURIComponent(accountId)}; path=/; max-age=31536000; samesite=lax`;
}

/** Reads the hint cookie value (account id), or null when absent. */
export function readZkHintCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ZK_HINT_COOKIE}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function clearZkHintCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ZK_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
