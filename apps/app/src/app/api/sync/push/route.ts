import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { SYNC_BULK_LIMIT } from "@withink/core/sync";

import { handleError } from "@/server/errors";
import {
  EntrySyncService,
  syncPushEntrySchema,
} from "@/features/journal/services/entry-sync-service";

import { requireSyncSession } from "../_lib";

const pushSchema = z.object({
  entries: z.array(syncPushEntrySchema).min(1).max(SYNC_BULK_LIMIT),
});

/**
 * Persists a batch of entries. Each entry is independently validated and
 * rejected (with a reason) rather than failing the whole batch — the client
 * keeps rejected entries in its queue and surfaces the reason.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("push", 240);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await EntrySyncService.push(auth.userId, parsed.data.entries),
    );
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}
