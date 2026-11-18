import { NextResponse } from "next/server";

import { handleError } from "@/server/errors";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";

import { requireSyncSession } from "../_lib";

/** Notebook membership/usage for local-first clients. */
export async function GET() {
  const auth = await requireSyncSession("notebooks");
  if (auth.response) return auth.response;

  try {
    return NextResponse.json({
      notebooks: await EntrySyncService.notebooks(auth.userId),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}
