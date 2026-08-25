import type { DecryptedEntry } from "@/features/journal/services/journal-service";

interface MediaEntryCache {
  key: CryptoKey;
  /** Timestamp of the last server fetch so we can bound staleness. */
  fetchedAt: number;
  entries: DecryptedEntry[];
  /** Plaintext HTML per entry date, built lazily while scanning for image URLs. */
  htmlByDate: Map<string, string>;
}

const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

let mediaEntryCache: MediaEntryCache | null = null;

/**
 * Session-scoped cache of journal entries used by the media lightbox, keyed by
 * the unlocked master key. The lightbox used to re-download and re-decrypt the
 * entire journal on every open; this makes repeated opens (and prev/next
 * navigation) reuse the fetched entries and the already-decrypted HTML map.
 * Cleared on lock so plaintext is released from memory.
 */
export function getMediaEntryCache(
  masterKey: CryptoKey,
): MediaEntryCache | null {
  if (
    mediaEntryCache &&
    mediaEntryCache.key === masterKey &&
    Date.now() - mediaEntryCache.fetchedAt < CACHE_MAX_AGE_MS
  ) {
    return mediaEntryCache;
  }
  return null;
}

export function setMediaEntryCache(
  masterKey: CryptoKey,
  entries: DecryptedEntry[],
): MediaEntryCache {
  mediaEntryCache = {
    key: masterKey,
    fetchedAt: Date.now(),
    entries,
    htmlByDate: new Map(),
  };
  return mediaEntryCache;
}

export function clearMediaEntryCache(): void {
  mediaEntryCache = null;
}
