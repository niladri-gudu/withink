import type { NextResponse } from "next/server";
import { API_ERROR_CODES, type ApiErrorCode } from "@withink/contracts";

import { isBearerRequest } from "@/lib/api-auth";
import { getRequestSession } from "@/lib/request-cache";
import { apiError } from "@/server/api-error";
import { rateLimit } from "@/server/rate-limit";
import { LockService } from "@/features/lock/services/lock-service";

export type ApiSession =
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse };

/**
 * Shared auth + rate-limit gate for every non-sync HTTP route the native
 * client calls. Session, lock and rate-limit semantics match the Server
 * Actions and `/api/sync/*`: bearer sessions skip the cookie unlock gate
 * because the device holds the master key.
 */
export async function requireApiSession(
  scope: string,
  limit = 120,
): Promise<ApiSession> {
  const session = await getRequestSession();
  if (!session) {
    return { response: apiError("UNAUTHORIZED", "Unauthorized") };
  }

  const rate = await rateLimit(`${scope}:${session.user.id}`, {
    limit,
    windowSeconds: 60,
  });
  if (!rate.success) {
    return {
      response: apiError(
        "RATE_LIMITED",
        "Too many requests. Try again shortly.",
      ),
    };
  }

  if (!(await isBearerRequest())) {
    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { response: apiError("LOCKED", "Locked") };
    }
  }

  return { userId: session.user.id };
}

const KNOWN_CODES = new Set<string>(API_ERROR_CODES);

/**
 * Maps a Server Action result `{ success: false, error, code? }` onto the
 * shared HTTP envelope. Actions and routes share the same service layer, so
 * their failure copy and rule codes must stay identical.
 */
export function apiErrorFromResult(
  result: { error?: string; code?: string },
  fallback: ApiErrorCode = "BUSINESS_RULE",
): NextResponse {
  const message = result.error ?? "The request could not be completed.";
  const code =
    result.code && KNOWN_CODES.has(result.code)
      ? (result.code as ApiErrorCode)
      : fallback;
  return apiError(code, message);
}
