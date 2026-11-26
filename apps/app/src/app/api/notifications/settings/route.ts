import { NextResponse, type NextRequest } from "next/server";
import { notificationSettingsSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import {
  getNotificationSettingsAction,
  saveNotificationSettingsAction,
} from "@/features/notifications/actions/notification-actions";

import { apiErrorFromResult, requireApiSession } from "../../_lib";

const MAX_BODY_BYTES = 4 * 1024;

/** Reminder preferences plus the safe public key for web-push opt-in. */
export async function GET() {
  const auth = await requireApiSession("notifications:settings");
  if (auth.response) return auth.response;

  const result = await getNotificationSettingsAction();
  if (!result.success) return apiErrorFromResult(result, "INTERNAL");
  return NextResponse.json({
    configured: result.configured,
    publicKey: result.publicKey,
    deviceCount: result.deviceCount,
    settings: result.settings,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession("notifications:settings:write", 30);
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

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid settings.",
    );
  }

  const result = await saveNotificationSettingsAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({ ok: true });
}
