import { NextResponse, type NextRequest } from "next/server";
import { syncDeleteRequestSchema } from "@withink/contracts";

import { apiError, apiErrorFrom } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";

import { requireSyncSession } from "../_lib";

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("delete");
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
  const parsed = syncDeleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid request.");
  }

  try {
    return NextResponse.json({
      success: await EntrySyncService.remove(auth.userId, parsed.data.date),
    });
  } catch (error) {
    return apiErrorFrom(error);
  }
}
