import { diaryCacheDB } from "@/lib/diary-cache-db";

import { diaryCacheService } from "./diary-cache-service";

export type SyncState = "synced" | "pending";

const LAST_SYNCED_KEY = "withink_last_synced";

/**
 * Coordinates background cloud sync for the local-first journal.
 *
 * Entries are written to the encrypted IndexedDB store the moment the user
 * types (see `use-auto-save`); this service is responsible for reconciling
 * that local store with the cloud in the background:
 *
 * 1. Push — drains the pending sync queue (local is authoritative while a
 *    date is pending, last-write-wins).
 * 2. Pull — fetches cloud changes that are newer than local, never
 *    overwriting locally-pending edits.
 *
 * Runs are single-flight and coalesced: rapid triggers (one per autosave)
 * collapse into at most one in-flight run plus one follow-up run.
 */
export class JournalSyncService {
  private pendingDates = new Set<string>();
  private version = 0;
  private listeners = new Set<() => void>();
  private running = false;
  private pullQueued = false;
  private workQueued = false;
  private lastSynced: string | null = null;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): number {
    return this.version;
  }

  getStatus(date: string): SyncState {
    return this.pendingDates.has(date) ? "pending" : "synced";
  }

  getLastSynced(): string | null {
    if (this.lastSynced) return this.lastSynced;
    if (typeof window === "undefined") return null;
    try {
      this.lastSynced = window.localStorage.getItem(LAST_SYNCED_KEY);
    } catch {
      this.lastSynced = null;
    }
    return this.lastSynced;
  }

  /**
   * Marks a date as pending cloud sync so the UI can react instantly (before
   * the background push round-trip completes).
   */
  markPending(date: string): void {
    if (this.pendingDates.has(date)) return;
    this.pendingDates.add(date);
    this.emit();
  }

  /**
   * Push-only sync. Called after every local autosave; cheap when the queue is
   * empty, so it is safe to fire on every keystroke-debounce.
   */
  requestPush(masterKey: CryptoKey): Promise<void> {
    return this.request(masterKey, false);
  }

  /**
   * Full push + pull reconciliation. Called on unlock, network recovery, tab
   * visibility, and the periodic background interval.
   */
  requestSync(masterKey: CryptoKey): Promise<void> {
    return this.request(masterKey, true);
  }

  private request(masterKey: CryptoKey, wantsPull: boolean): Promise<void> {
    if (wantsPull) this.pullQueued = true;
    this.workQueued = true;
    if (this.running) return Promise.resolve();
    this.running = true;
    return this.runLoop(masterKey);
  }

  private async runLoop(masterKey: CryptoKey): Promise<void> {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Drop queued work while offline — it is re-triggered on `online`,
        // tab visibility, and the periodic interval.
        this.workQueued = false;
        this.pullQueued = false;
        await this.refreshState();
        return;
      }

      this.workQueued = false;

      const { getLocalDateString } = await import("@/lib/utils/date");
      const localToday = getLocalDateString();

      // 1. Push pending local edits to the cloud first.
      const result = await diaryCacheService.flushOfflineSyncQueue(
        masterKey,
        localToday,
      );
      if (result.succeeded.length > 0 || result.failed.length > 0) {
        this.recordLastSynced();
      }

      // 2. Pull remote changes in the background (never overwrites pending).
      if (this.pullQueued) {
        this.pullQueued = false;
        const pulled = await diaryCacheService.syncDiaryCache(
          masterKey,
          localToday,
        );
        if (pulled) this.recordLastSynced();
      }

      await this.refreshState();
    } catch (err) {
      console.error("Journal background sync failed:", err);
    } finally {
      this.running = false;
      if (this.workQueued || this.pullQueued) {
        this.workQueued = false;
        void this.request(masterKey, this.pullQueued);
      }
    }
  }

  private async refreshState(): Promise<void> {
    const items = await diaryCacheDB.getAllSyncItems();
    const pending = new Set(items.map((item) => item.key));
    const changed =
      pending.size !== this.pendingDates.size ||
      [...pending].some((date) => !this.pendingDates.has(date));
    if (changed) {
      this.pendingDates = pending;
      this.emit();
    }
  }

  private recordLastSynced(): void {
    this.lastSynced = new Date().toISOString();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_SYNCED_KEY, this.lastSynced);
      } catch {
        // Storage failures should never break sync.
      }
    }
  }

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }
}

export const journalSyncService = new JournalSyncService();
