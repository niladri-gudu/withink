import { NextResponse, type NextRequest } from "next/server";
import {
  registerPushDeviceSchema,
  unregisterPushDeviceSchema,
} from "@withink/contracts";

import { apiError, apiErrorFrom } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { ExpoPushTokenRepository } from "@/features/notifications/repositories/expo-push-token-repository";

import { requireApiSession } from "../../_lib";

const MAX_BODY_BYTES = 4 * 1024;

/**
 * Registers the install's Expo push token. The token is a capability: it is
 * stored per user, never logged, and only sent to Expo's push endpoint.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiSession("notifications:devices:write", 30);
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

  const parsed = registerPushDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid push token.");
  }

  try {
    await ExpoPushTokenRepository.upsert(auth.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorFrom(error);
  }
}

/** Called on sign-out and by "turn reminders off" on this device. */
export async function DELETE(request: NextRequest) {
  const auth = await requireApiSession("notifications:devices:write", 30);
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

  const parsed = unregisterPushDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid push token.");
  }

  try {
    await ExpoPushTokenRepository.deleteByToken(auth.userId, parsed.data.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorFrom(error);
  }
}
