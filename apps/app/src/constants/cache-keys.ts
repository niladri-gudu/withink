export const CACHE_KEYS = {
  // Frequently accessed lists or single entries (short-lived)
  ENTRY_HOT: (userId: string, dateStr: string) =>
    `user:${userId}:entry:${dateStr}`,
  // User statistics & streak details (medium-lived)
  STATS: (userId: string) => `user:${userId}:stats`,
  // Flashbacks (medium-lived)
  FLASHBACK: (userId: string, dateStr: string) =>
    `user:${userId}:flashback:${dateStr}`,
} as const;

export const CACHE_TTL = {
  // Hot cache: 2 minutes
  HOT: 120,
  // Stat cache: 1 hour
  STATS: 3600,
  // Archive data or list cache: 2 hours
  ARCHIVE: 7200,
  // Long-lived static assets/configuration: 30 days
  VERSION_STATIC: 30 * 24 * 60 * 60,
} as const;

export type CacheKeys = typeof CACHE_KEYS;
export type CacheTtl = typeof CACHE_TTL;
