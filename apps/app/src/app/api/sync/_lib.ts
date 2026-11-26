import { headers } from "next/headers";
import type { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/request-cache";
import { apiError } from "@/server/api-error";
import { rateLimit } from "@/server/rate-limit";
import { LockService } from "@/features/lock/services/lock-service";

export type SyncAuth =
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse };

/**
 * Shared auth/rate-limit gate for the sync API. Session + lock checks match
 * the Server Actions; the rate limit is per user and per route family so one
 * runaway client cannot exhaust Mongo or Redis.
 */
export async function requireSyncSession(
  route: string,
  limit = 120,
): Promise<SyncAuth> {
  const session = await getRequestSession();
  if (!session) {
    return { response: apiError("UNAUTHORIZED", "Unauthorized") };
  }

  const rate = await rateLimit(`sync:${route}:${session.user.id}`, {
    limit,
    windowSeconds: 60,
  });
  if (!rate.success) {
    return {
      response: apiError(
        "RATE_LIMITED",
        "Too many sync requests. Try again shortly.",
      ),
    };
  }

  // Native clients (Expo) authenticate with a bearer session token and have
  // no `withink-unlocked` cookie; their lock is the on-device key. The server
  // lock stays enforced for cookie-authenticated web sessions.
  const headerStore = await headers();
  const isBearer =
    headerStore.get("authorization")?.toLowerCase().startsWith("bearer ") ??
    false;

  if (!isBearer) {
    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { response: apiError("LOCKED", "Locked") };
    }
  }

  return { userId: session.user.id };
}
