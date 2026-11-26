import { NextResponse, type NextRequest } from "next/server";
import { deleteAccountSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { deleteAccountAction } from "@/features/settings/actions/settings-actions";

import { apiErrorFromResult, requireApiSession } from "../../_lib";

const MAX_BODY_BYTES = 1024;

/**
 * In-app account deletion (a store requirement). Credential accounts must
 * re-enter their password; the action cancels billing, purges Mongo/R2 rows
 * and invalidates caches. Irreversible.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiSession("account:delete", 5);
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

  const parsed = deleteAccountSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid request.");
  }

  const result = await deleteAccountAction(parsed.data.password);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({ ok: true });
}
