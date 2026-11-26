import { NextResponse, type NextRequest } from "next/server";
import { encryptionMutationRequestSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import {
  enableClientEncryptionAction,
  getEncryptionSettingsAction,
  updateDiaryPasswordAction,
} from "@/features/encryption/actions/encryption-actions";

import { apiErrorFromResult, requireApiSession } from "../../_lib";

// A full migration carries every encrypted entry; bound it well below the
// Server Action ceiling so a crafted body cannot exhaust memory.
const MAX_BODY_BYTES = 32 * 1024 * 1024;

/** Salt, iteration policy and verification blob — never the master key. */
export async function GET() {
  const auth = await requireApiSession("settings:encryption");
  if (auth.response) return auth.response;

  const result = await getEncryptionSettingsAction();
  if (!result.success || !result.data) {
    return apiErrorFromResult(result, "INTERNAL");
  }
  return NextResponse.json(result.data);
}

/**
 * One endpoint, two privileged operations:
 * - `enable`: migrate every entry to client ciphertext and turn ZK on.
 * - `change-password`: re-wrap the master key with a new diary password.
 * Both require the caller to hold the master key (unlock proof / unlock).
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiSession("settings:encryption:write", 10);
  if (auth.response) return auth.response;

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

  const parsed = encryptionMutationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid encryption request.",
    );
  }

  const result =
    parsed.data.action === "enable"
      ? await enableClientEncryptionAction(
          parsed.data.salt,
          parsed.data.verificationCiphertext,
          parsed.data.entries,
          parsed.data.unlockProof,
          parsed.data.kdfIterations,
        )
      : await updateDiaryPasswordAction(
          parsed.data.verificationCiphertext,
          parsed.data.unlockProof,
          parsed.data.kdfIterations,
        );

  if (!result.success) {
    if (result.error === "UNLOCK_PROOF_NOT_BOUND") {
      return apiError(
        "UNLOCK_PROOF_NOT_BOUND",
        "Unlock verification isn't set up for this account yet.",
      );
    }
    return apiErrorFromResult(result);
  }
  return NextResponse.json({ ok: true });
}
