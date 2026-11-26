import "server-only";

import { headers } from "next/headers";

import { LockService } from "@/features/lock/services/lock-service";

/**
 * Request authentication helpers shared by route handlers and the Server
 * Actions they mirror.
 *
 * Native clients authenticate with a bearer session token and have no
 * `withink-unlocked` cookie; their lock is the on-device master key, so the
 * cookie gate is only enforced for cookie-authenticated web requests. This is
 * the same rule `/api/sync/*` already applies.
 */
export async function isBearerRequest(): Promise<boolean> {
  const headerStore = await headers();
  return (
    headerStore.get("authorization")?.toLowerCase().startsWith("bearer ") ??
    false
  );
}

/**
 * True when the caller may touch protected content. Bearer callers prove
 * possession of the key on-device before authenticating; cookie callers need
 * the server unlock cookie.
 */
export async function isUnlockedForRequest(userId: string): Promise<boolean> {
  if (await isBearerRequest()) return true;
  return LockService.isSessionUnlocked(userId);
}
