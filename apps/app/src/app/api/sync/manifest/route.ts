import { NextResponse } from "next/server";

import { apiErrorFrom } from "@/server/api-error";
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
    return apiErrorFrom(error);
  }
}
