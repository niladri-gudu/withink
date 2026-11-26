import { requireApiSession, type ApiSession } from "../_lib";

export type SyncAuth = ApiSession;

/**
 * Sync keeps its own prefix so the rate-limit buckets stay stable; the auth,
 * lock and bearer rules are shared with every other native route.
 */
export async function requireSyncSession(
  route: string,
  limit = 120,
): Promise<SyncAuth> {
  return requireApiSession(`sync:${route}`, limit);
}
