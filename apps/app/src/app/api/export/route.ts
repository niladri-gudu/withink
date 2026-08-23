import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";
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

  // Export is the most expensive endpoint (full DB scan + per-image R2
  // fetches + ZIP compression). Cap it so concurrent requests can't exhaust
  // server memory or bucket throughput.
  const limit = await rateLimit(`export:${session.user.id}`, {
    limit: 3,
    windowSeconds: 3600,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Export limit reached. Please try again later." },
      { status: 429 },
    );
  }

  const unlocked = await LockService.isSessionUnlocked(session.user.id);
  if (!unlocked) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  try {
    const bytes = await ExportService.generateExportZip(session.user.id);
    const filename = `withink-export-${new Date().toLocaleDateString("en-CA")}.zip`;

    // bytes is an ArrayBuffer — handed straight to the response body, so the
    // archive is never copied a second time at peak memory.
    return new NextResponse(bytes, {
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
