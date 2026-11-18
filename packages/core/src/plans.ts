/**
 * Shared pricing/entitlement matrix.
 *
 * Server and client both consume this: the server enforces it, the client
 * caches/represents it (and must never be trusted for paid server resources).
 */

export const KB = 1024;
export const MB = 1024 * KB;
export const GB = 1024 * MB;

export type ResolvedPlan = "free" | "plus" | "pro";
export type PaidPlan = Exclude<ResolvedPlan, "free">;

export interface Entitlements {
  plan: ResolvedPlan;
  /** How far back (days) a NEW entry may be created. Infinity = unlimited. */
  backfillDays: number;
  /** Total uploaded photo bytes allowed per user. */
  mediaStorageBytes: number;
  /**
   * Concurrent signed-in sessions. Signing in beyond this soft-kicks the
   * oldest session; Infinity = unlimited devices.
   */
  maxConcurrentSessions: number;
  /**
   * Maximum notebooks a user may CREATE (grandfathering: existing notebooks
   * stay fully usable on downgrade; only new creation is gated).
   */
  notebookLimit: number;
  /** Simultaneously sealed letters to the future. */
  futureLetterLimit: number;
  /**
   * Curated color palettes beyond the standard Desk/Dusk world (Plus and
   * up). Existing selections are grandfathered on downgrade — only new
   * selection is gated.
   */
  curatedThemes: boolean;
  /**
   * Pro appearance extras on top of curatedThemes: curated font pairings
   * and accent variants. Existing selections are grandfathered on
   * downgrade — only new selection is gated.
   */
  proAppearance: boolean;
}

export const ENTITLEMENTS: Record<ResolvedPlan, Entitlements> = {
  free: {
    plan: "free",
    backfillDays: 14,
    mediaStorageBytes: 100 * MB,
    maxConcurrentSessions: 1,
    notebookLimit: 1,
    futureLetterLimit: 0,
    curatedThemes: false,
    proAppearance: false,
  },
  plus: {
    plan: "plus",
    backfillDays: 90,
    mediaStorageBytes: 10 * GB,
    maxConcurrentSessions: 3,
    notebookLimit: 3,
    futureLetterLimit: 3,
    curatedThemes: true,
    proAppearance: false,
  },
  pro: {
    plan: "pro",
    backfillDays: Number.POSITIVE_INFINITY,
    mediaStorageBytes: 50 * GB,
    maxConcurrentSessions: Number.POSITIVE_INFINITY,
    notebookLimit: 10,
    futureLetterLimit: Number.POSITIVE_INFINITY,
    curatedThemes: true,
    proAppearance: true,
  },
};

/** Entitlements handed out when no billing record exists (default tier). */
export function freeEntitlements(): Entitlements {
  // Copy per caller so mutations can never poison the shared matrix.
  return { ...ENTITLEMENTS.free };
}
