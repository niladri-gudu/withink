import { NextResponse, type NextRequest } from "next/server";
import { unlockRequestSchema, type UnlockResponse } from "@withink/contracts";

import { redis } from "@/lib/redis";
import { getRequestSession } from "@/lib/request-cache";
import { mintUnlockToken } from "@/lib/unlock-token";
import { apiError, apiErrorFrom } from "@/server/api-error";
import { rateLimit } from "@/server/rate-limit";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { LockRepository } from "@/features/lock/repositories/lock-repository";
import { LockService } from "@/features/lock/services/lock-service";

const MAX_BODY_BYTES = 512;

/**
 * Exchanges a client-derived unlock proof for a short-lived native token.
 *
 * The web keeps using its HttpOnly unlock cookie. Native clients send the
 * returned token in `X-Withink-Unlock` on media/export requests, which cannot
 * carry the cookie. The proof is an HKDF subkey of the master key, so only a
 * client that actually decrypted the diary can obtain a token.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Unauthorized");
    }

    const gate = await rateLimit(`unlock:token:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!gate.success) {
      return apiError(
        "RATE_LIMITED",
        "Too many unlock requests. Try again shortly.",
      );
    }

    let body: unknown;
    try {
      body = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      const tooLarge = error instanceof BodyTooLargeError;
      return apiError(
        tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST",
        tooLarge ? "Payload too large." : "Invalid request.",
      );
    }

    const parsed = unlockRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_REQUEST", "Invalid unlock proof.");
    }

    const settings = await LockRepository.getSettings(session.user.id);
    if (settings?.isLockEnabled) {
      if (!settings.unlockProofHash) {
        return apiError(
          "UNLOCK_PROOF_NOT_BOUND",
          "Unlock verification isn't set up for this account yet.",
        );
      }

      if (
        !LockService.verifyUnlockProofHash(
          parsed.data.proof,
          settings.unlockProofHash,
        )
      ) {
        // Same counter as the Server Action: failures from either path share
        // one budget, and a success clears it.
        const failure = await rateLimit(
          `lock:unlock-proof:${session.user.id}`,
          { limit: 10, windowSeconds: 300, failClosed: true },
        );
        if (!failure.success) {
          return apiError(
            "RATE_LIMITED",
            "Too many failed attempts. Please try again in 5 minutes.",
          );
        }
        return apiError("UNLOCK_PROOF_INVALID", "Unlock verification failed.");
      }
    }

    if (redis) {
      try {
        await redis.del(`ratelimit:lock:unlock-proof:${session.user.id}`);
      } catch {
        // Best-effort cleanup; the token is still safe to mint.
      }
    }

    const { token, expiresAt } = mintUnlockToken(session.user.id);
    const response: UnlockResponse = {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    return apiErrorFrom(error);
  }
}
