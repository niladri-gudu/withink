import { NextResponse, type NextRequest } from "next/server";
import { updateLockSettingsSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import {
  getLockSettingsAction,
  saveLockSettingsAction,
} from "@/features/lock/actions/lock-actions";

import { apiErrorFromResult, requireApiSession } from "../../_lib";

const MAX_BODY_BYTES = 8 * 1024;

/** Lock settings for the native settings screen. */
export async function GET() {
  const auth = await requireApiSession("settings:lock");
  if (auth.response) return auth.response;

  const result = await getLockSettingsAction();
  if (!result.success || !result.data) {
    return apiErrorFromResult(result, "INTERNAL");
  }
  return NextResponse.json(result.data);
}

/**
 * Enables/disables the lock or rotates the passcode. Privileged transitions
 * still require the current passcode or the master-key unlock proof; the
 * action enforces that, this route only validates the shape.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiSession("settings:lock:write", 30);
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

  const parsed = updateLockSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid settings.",
    );
  }

  const result = await saveLockSettingsAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({ ok: true });
}
