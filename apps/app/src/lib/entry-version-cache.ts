import "server-only";

import { cache } from "react";

import { getCachedValue, setCachedValue } from "@/lib/redis";

const ENTRY_VERSION_TTL_SECONDS = 2592000; // 30 days

/**
 * Request-scoped holder for the entry cache version.
 *
 * Every version-keyed entry read on a dashboard render (today, yesterday, the
 * date list, the flashback) fetched the same `entries:{userId}:version` key
 * independently. Memoizing it here collapses those into one round-trip.
 *
 * The holder is mutable because a render-time backfill bumps the version
 * (`NotebookService.ensureBootstrapped` → `bumpUserEntryVersion`), and reads
 * later in the same render must use the new key namespace. The bump updates
 * `current` in place instead of leaving a stale version cached.
 */
const getVersionHolder = cache(async (userId: string) => {
  const key = `entries:${userId}:version`;
  const version = await getCachedValue<number>(key);

  if (version !== null) {
    return { current: version };
  }

  await setCachedValue(key, 1, ENTRY_VERSION_TTL_SECONDS);
  return { current: 1 };
});

export async function getRequestUserEntryVersion(
  userId: string,
): Promise<number> {
  return (await getVersionHolder(userId)).current;
}

export async function setRequestUserEntryVersion(
  userId: string,
  version: number,
): Promise<void> {
  (await getVersionHolder(userId)).current = version;
}
