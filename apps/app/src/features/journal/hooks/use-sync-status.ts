"use client";

import { useSyncExternalStore } from "react";

import {
  journalSyncService,
  type SyncState,
} from "../services/journal-sync-service";

/**
 * Reactively reports whether the given date is pending cloud sync.
 * Re-renders whenever the sync service notifies (background push/pull cycles).
 */
export function useSyncStatus(date: string): SyncState {
  useSyncExternalStore(
    (listener) => journalSyncService.subscribe(listener),
    () => journalSyncService.getSnapshot(),
    () => journalSyncService.getSnapshot(),
  );
  return journalSyncService.getStatus(date);
}

export interface JournalSyncSummary {
  pendingCount: number;
  lastSyncedAt: number | null;
}

/** Account-wide sync summary for the Settings card / status UI. */
export function useJournalSyncSummary(): JournalSyncSummary {
  useSyncExternalStore(
    (listener) => journalSyncService.subscribe(listener),
    () => journalSyncService.getSnapshot(),
    () => 0,
  );
  return {
    pendingCount: journalSyncService.getPendingCount(),
    lastSyncedAt: journalSyncService.getLastSyncedAt(),
  };
}
