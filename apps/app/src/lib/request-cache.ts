import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getViewerToday } from "@/lib/viewer-today";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { JournalService } from "@/features/journal/services/journal-service";
import { LockRepository } from "@/features/lock/repositories/lock-repository";
import { NotebooksService } from "@/features/notebooks/services/notebook-service";

/**
 * Per-request memoization helpers.
 *
 * React `cache()` dedupes async calls within a single server request, so the
 * layout and the page it wraps share one session lookup / lock-settings read
 * instead of each hitting the database independently.
 *
 * NOTE: Server Actions and API route handlers each run in their own request and
 * are intentionally NOT routed through these helpers — they call
 * `auth.api.getSession` directly and their tests mock that exact API.
 */

export const getRequestSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

export const getRequestLockSettings = cache(async (userId: string) => {
  return await LockRepository.getSettings(userId);
});

/**
 * Encryption settings are read by the layout, the lower dashboard grid, and
 * the letter-arrival card on the same render. Without this memoization that is
 * three identical Redis round-trips per navigation.
 */
export const getRequestEncryptionSettings = cache(async (userId: string) => {
  return await EncryptionSettingsRepository.getSettings(userId);
});

/**
 * The viewer-local date is resolved from a cookie. The dashboard page and the
 * letter-arrival card both need it; memoize so the cookie parse happens once.
 */
export const getRequestViewerToday = cache(async () => {
  return await getViewerToday();
});

/**
 * Plan entitlements are read by the page shell, the editor and several gates
 * on the same render. Memoize so the Redis (or Mongo) read happens once.
 */
export const getRequestEntitlements = cache(async (userId: string) => {
  return await EntitlementsService.getEntitlements(userId);
});

/**
 * Notebooks (with usage stats) are needed by the timeline, the editor's
 * filing target and the notebooks page. The service bootstraps the default
 * notebook on first call, so a second un-memoized read would repeat that
 * work (and its backfill write) within one request.
 */
export const getRequestNotebooks = cache(async (userId: string) => {
  return await NotebooksService.listNotebooks(userId);
});

/**
 * Calendar rows and aggregate stats are version-keyed and shared by the page
 * shell and its folio/streak widgets; memoize them per request.
 */
export const getRequestCalendarEntries = cache(async (userId: string) => {
  return await JournalService.getCalendarEntries(userId);
});

export const getRequestEntryStats = cache(async (userId: string) => {
  return await JournalService.getEntryStats(userId);
});
