import type { SyncIndexRecord, SyncListItem } from "./sync";

/**
 * Framework-neutral sync planning.
 *
 * The web and native clients keep their own stores (IndexedDB / SQLite) and
 * transports (Server Actions / HTTP), but the decision of *what to fetch and
 * what to prune* must be identical on both or they will disagree about the
 * journal. This module owns that decision; adapters only read/write.
 */

/** Do not prune a record that may still be inside replication lag. */
export const DEFAULT_PRUNE_GRACE_MS = 15 * 60 * 1000;

/** Stable fingerprint of the server sync list. Same list → same string. */
export function syncListFingerprint(
  entries: readonly SyncListItem[],
): string {
  return entries.map((entry) => `${entry.date}:${entry.updatedAt}`).join("|");
}

export interface SyncPullPlanInput {
  /** Every `{date, updatedAt}` the server reports. */
  serverEntries: readonly SyncListItem[];
  /** The client's plaintext sync index. */
  localIndex: readonly SyncIndexRecord[];
  /** Dates with queued local edits; never fetched or pruned. */
  pendingDates: Iterable<string>;
  /** Metadata schema version this client writes; older rows are re-fetched. */
  metadataVersion: number;
  nowMs: number;
  /** Override only in tests. */
  pruneGraceMs?: number;
}

export interface SyncPullPlan {
  fingerprint: string;
  /** Server-side dates (diagnostics/tests). */
  serverDates: string[];
  /** Local dates absent from the server and outside the grace window. */
  pruneDates: string[];
  /** Dates to fetch: missing locally or newer on the server. */
  fetchDates: string[];
}

/**
 * Mirrors the web pull algorithm exactly:
 *
 * - A pending local edit is authoritative; never fetch or prune it.
 * - A sync-index row written by an older metadata version is treated as
 *   missing, so the entry is fetched once after a format bump.
 * - A local row is pruned only when the server no longer has the date, it is
 *   not pending, its timestamp is parseable, and it is older than the grace
 *   window (a flush can consume its queue item just before the server's list
 *   reflects the write).
 */
export function planSyncPull(input: SyncPullPlanInput): SyncPullPlan {
  const pending = new Set(input.pendingDates);
  const serverDates = new Set(input.serverEntries.map((entry) => entry.date));
  const graceMs = input.pruneGraceMs ?? DEFAULT_PRUNE_GRACE_MS;

  const localUpdatedAt = new Map<string, string>();
  for (const row of input.localIndex) {
    localUpdatedAt.set(
      row.date,
      row.v === input.metadataVersion ? row.updatedAt : "",
    );
  }

  const pruneDates: string[] = [];
  for (const [date, updatedAt] of localUpdatedAt) {
    if (serverDates.has(date) || pending.has(date)) continue;
    const timestamp = new Date(updatedAt).getTime();
    if (!Number.isFinite(timestamp)) continue;
    if (input.nowMs - timestamp > graceMs) pruneDates.push(date);
  }

  const fetchDates: string[] = [];
  for (const entry of input.serverEntries) {
    if (pending.has(entry.date)) continue;
    const local = localUpdatedAt.get(entry.date);
    if (!local) {
      fetchDates.push(entry.date);
      continue;
    }
    if (new Date(entry.updatedAt).getTime() !== new Date(local).getTime()) {
      fetchDates.push(entry.date);
    }
  }

  return {
    fingerprint: syncListFingerprint(input.serverEntries),
    serverDates: [...serverDates],
    pruneDates,
    fetchDates,
  };
}
