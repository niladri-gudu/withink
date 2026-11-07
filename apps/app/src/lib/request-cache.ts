import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getViewerToday } from "@/lib/viewer-today";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LockRepository } from "@/features/lock/repositories/lock-repository";

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
