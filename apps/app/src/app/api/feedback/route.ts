import { NextResponse, type NextRequest } from "next/server";
import { feedbackSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { submitFeedbackAction } from "@/features/feedback/actions/feedback-actions";

import { apiErrorFromResult, requireApiSession } from "../_lib";

/** 4,000-char message + subject + attachment URL fits comfortably. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Feedback submission for native clients. The Server Action (used by the web
 * form) remains the implementation: session, attachment ownership, the
 * hourly per-user limit and the team email all apply here unchanged.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiSession("feedback:submit", 5);
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

  const parsed = feedbackSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid request.",
    );
  }

  const result = await submitFeedbackAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({ ok: true });
}
