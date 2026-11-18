import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { handleError } from "@/server/errors";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";
import { dateStringSchema } from "@/features/journal/validation/entry-schema";

import { requireSyncSession } from "../_lib";

const deleteSchema = z.object({ date: dateStringSchema });

export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("delete");
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      success: await EntrySyncService.remove(auth.userId, parsed.data.date),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}
