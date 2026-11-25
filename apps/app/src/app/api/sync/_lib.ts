import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { getRequestSession } from "@/lib/request-cache";
import { LockService } from "@/features/lock/services/lock-service";
import { rateLimit } from "@/server/rate-limit";

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
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const rate = await rateLimit(`sync:${route}:${session.user.id}`, {
    limit,
    windowSeconds: 60,
  });
  if (!rate.success) {
    return {
      response: NextResponse.json(
        { error: "Too many sync requests. Try again shortly." },
        { status: 429 },
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
      return {
        response: NextResponse.json({ error: "Locked" }, { status: 403 }),
      };
    }
  }

  return { userId: session.user.id };
}
