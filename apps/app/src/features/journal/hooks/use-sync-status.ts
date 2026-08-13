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
