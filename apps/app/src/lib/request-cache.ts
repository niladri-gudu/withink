import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
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
