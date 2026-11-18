import { NextResponse } from "next/server";

import { handleError } from "@/server/errors";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";

import { requireSyncSession } from "../_lib";

/** `{date, updatedAt}` for every entry — the client's pull diff. */
export async function GET() {
  const auth = await requireSyncSession("manifest");
  if (auth.response) return auth.response;

  try {
    return NextResponse.json({
      entries: await EntrySyncService.manifest(auth.userId),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}
