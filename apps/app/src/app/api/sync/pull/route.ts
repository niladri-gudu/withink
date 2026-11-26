import { NextResponse, type NextRequest } from "next/server";
import { syncPullRequestSchema } from "@withink/contracts";

import { apiError, apiErrorFrom } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";

import { requireSyncSession } from "../_lib";

const MAX_BODY_BYTES = 64 * 1024;

/** Full ciphertext entries for a bounded set of dates. */
export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("pull");
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
  const parsed = syncPullRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid request.");
  }

  try {
    return NextResponse.json({
      entries: await EntrySyncService.pull(auth.userId, parsed.data.dates),
    });
  } catch (error) {
    return apiErrorFrom(error);
  }
}
