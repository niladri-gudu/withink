import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { logger } from "@/server/logger";
import { ExportService } from "@/features/export/services/export-service";
import { LockService } from "@/features/lock/services/lock-service";

/**
 * Streams a complete ZIP backup of the authenticated user's journal.
 * Binary file downloads belong in a route handler rather than a Server Action.
 */
export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlocked = await LockService.isSessionUnlocked(session.user.id);
  if (!unlocked) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  try {
    const bytes = await ExportService.generateExportZip(session.user.id);
    const filename = `withink-export-${new Date().toLocaleDateString("en-CA")}.zip`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const appError = handleError(error);
    logger.error("Export generation failed", error as Error, {
      statusCode: appError.statusCode,
    });
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}
