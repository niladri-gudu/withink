import "server-only";

import { cookies } from "next/headers";

import { getLocalDateString, isDateString } from "@/lib/utils/date";

/**
 * Viewer-local today, resolved from the client-maintained timezone cookie.
 * Day boundaries must never be trusted from request input.
 */
export async function getViewerToday(): Promise<string> {
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  return isDateString(cookieToday) ? cookieToday : getLocalDateString();
}
