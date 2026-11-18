import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { SYNC_BULK_LIMIT } from "@withink/core/sync";

import { handleError } from "@/server/errors";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";
import { dateStringSchema } from "@/features/journal/validation/entry-schema";

import { requireSyncSession } from "../_lib";

const pullSchema = z.object({
  dates: z.array(dateStringSchema).min(1).max(SYNC_BULK_LIMIT),
});

/** Full ciphertext entries for a bounded set of dates. */
export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("pull");
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = pullSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      entries: await EntrySyncService.pull(auth.userId, parsed.data.dates),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}
