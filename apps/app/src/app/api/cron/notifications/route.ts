import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/config/env";
import { logger } from "@/server/logger";
import { NotificationScheduler } from "@/features/notifications/services/notification-scheduler";

function matches(provided: string | null, secret: string): boolean {
  if (!provided) return false;
  const actual = Buffer.from(provided);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Vercel Cron entry point for reminders. Idempotent, so it may run every few
 * minutes: daily nudges and letter alerts are marked per local date before
 * sending. Auth is `Authorization: Bearer $CRON_SECRET` (Vercel's cron
 * convention); `?secret=` is accepted for manual/self-hosted schedulers.
 */
export async function GET(request: NextRequest) {
  // Explicit off-switch: reminders stay disabled in every environment until
  // someone sets CRON_ENABLED=true deliberately. No vercel.json schedule is
  // committed, so this also protects a manual/self-hosted scheduler.
  if (!env.CRON_ENABLED) {
    return NextResponse.json({ error: "Cron is disabled." }, { status: 503 });
  }

  const secret = env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cron is not configured." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer ?? request.nextUrl.searchParams.get("secret");

  if (!matches(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await NotificationScheduler.run();
    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      "Notification scheduler failed",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Notification scheduler failed." },
      { status: 500 },
    );
  }
}
