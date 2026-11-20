"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import { toast } from "sonner";

import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import { useJournalSyncSummary } from "../hooks/use-sync-status";
import { diaryCacheService } from "../services/diary-cache-service";
import { journalSyncService } from "../services/journal-sync-service";

function relativeTime(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Settings "Sync & backup" card. Shows the account-wide sync state and runs
 * the same push/pull engine as the background sync on demand.
 */
export function SyncStatusCard() {
  const { isClientEncrypted, masterKey } = useEncryption();
  const { pendingCount, lastSyncedAt } = useJournalSyncSummary();
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.clearInterval(tick);
    };
  }, []);

  const isLocal = isClientEncrypted && !!masterKey;

  const handleSync = async () => {
    if (!masterKey) {
      toast.error("Unlock your diary to sync.");
      return;
    }
    if (!online) {
      toast.error("You're offline. Sync will resume when you reconnect.");
      return;
    }

    setBusy(true);
    const today = getLocalDateString();
    try {
      const push = await diaryCacheService.flushOfflineSyncQueue(
        masterKey,
        today,
      );
      const pulled = await diaryCacheService.syncDiaryCache(masterKey, today);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["local-journal"] }),
      ]);

      if (push.failed.length === 0 && pulled) {
        journalSyncService.markSynced();
        setNow(Date.now());
        toast.success("Journal synced.");
      } else {
        toast.error("Some changes couldn't sync. We'll keep retrying.");
      }
    } catch {
      toast.error("Sync failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const status = !isClientEncrypted
    ? "This account saves directly to the cloud."
    : !masterKey
      ? "Unlock your diary to sync."
      : !online
        ? "Offline — changes stay safe on this device."
        : pendingCount > 0
          ? `${pendingCount} change${pendingCount === 1 ? "" : "s"} waiting to sync.`
          : lastSyncedAt
            ? `Synced ${relativeTime(lastSyncedAt, now)}.`
            : "Not synced yet.";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p
          className="text-foreground font-serif text-sm"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
        <p className="text-muted-foreground text-xs">
          Your journal stays encrypted on this device; sync keeps a copy in the
          cloud.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={handleSync}
        disabled={busy || !isLocal || !online}
      >
        {busy ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}
