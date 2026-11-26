import { NextResponse, type NextRequest } from "next/server";
import { syncPushRequestSchema } from "@withink/contracts";

import { apiError, apiErrorFrom } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";

import { requireSyncSession } from "../_lib";

// Generous enough for a full encrypted batch, small enough to bound memory.
const MAX_BODY_BYTES = 16 * 1024 * 1024;

/**
 * Persists a batch of entries. Each entry is independently validated and
 * rejected (with a reason) rather than failing the whole batch — the client
 * keeps rejected entries in its queue and surfaces the reason.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("push", 240);
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
  const parsed = syncPushRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid request.");
  }

  try {
    return NextResponse.json(
      await EntrySyncService.push(auth.userId, parsed.data.entries),
    );
  } catch (error) {
    return apiErrorFrom(error);
  }
}
