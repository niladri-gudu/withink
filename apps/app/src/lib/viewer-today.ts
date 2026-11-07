import "server-only";

import { cookies } from "next/headers";

import { addDays, isDateString } from "@/lib/utils/date";

/**
 * Every real timezone is within UTC-12 … UTC+14, so a viewer's local calendar
 * date can differ from the UTC date by at most one day. Anything larger is a
 * forged value, not a timezone.
 */
const MAX_VIEWER_OFFSET_DAYS = 1;

/** Calendar date (YYYY-MM-DD) in UTC — the timezone-independent anchor. */
function getUtcDateString(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The server's UTC calendar date, exported for layout/client-date checks. */
export function getServerToday(now = new Date()): string {
  return getUtcDateString(now);
}

/**
 * Clamp a viewer-supplied calendar date to the server clock.
 *
 * Day boundaries drive billing gates (backfill window), letter delivery, and
 * streaks, so they must never be trusted verbatim from the client. The cookie
 * and action parameter are hints only: a date within ±1 day of the UTC date is
 * honoured (timezones); anything else falls back to server time.
 */
export function clampViewerToday(candidate?: string | null): string {
  const serverToday = getUtcDateString();
  if (!isDateString(candidate)) return serverToday;

  const earliest = addDays(serverToday, -MAX_VIEWER_OFFSET_DAYS);
  const latest = addDays(serverToday, MAX_VIEWER_OFFSET_DAYS);
  return candidate >= earliest && candidate <= latest
    ? candidate
    : serverToday;
}

/**
 * Viewer-local today, resolved from the client-maintained timezone cookie and
 * clamped to the server clock.
 */
export async function getViewerToday(): Promise<string> {
  const cookieStore = await cookies();
  return clampViewerToday(cookieStore.get("withink-local-date")?.value);
}
