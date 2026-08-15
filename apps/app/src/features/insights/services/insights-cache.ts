import { cacheLife, cacheTag } from "next/cache";

import { InsightsService, type InsightsPayload } from "./insights-service";

/**
 * Cached entry point for the insights page's SSR render.
 *
 * The full computation is an O(n) scan + aggregation over the user's entry
 * metadata, so it must not run uncached on every navigation. It is keyed on
 * (userId, today, timezoneOffset) via the `use cache` directive and tagged
 * `insights:{userId}` so `saveEntry`/`deleteEntry` can `revalidateTag` it on
 * write — new entries show up immediately, and idle users get cached reads.
 */
export async function getCachedInsights(
  userId: string,
  todayStr: string,
  timezoneOffset = 0,
): Promise<InsightsPayload> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag(`insights:${userId}`);
  return InsightsService.getInsights(userId, todayStr, timezoneOffset);
}
