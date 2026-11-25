"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import { HardDrive, Loader2, ShieldCheck, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  getPersistentStorageStatus,
  getStorageEstimate,
  requestPersistentStorage,
} from "@/lib/persistent-storage";
import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";
import {
  BACKUP_RECORDED_EVENT,
  readLastExportAt,
} from "@/features/export/lib/backup-timestamp";
import { diaryCacheService } from "@/features/journal/services/diary-cache-service";

type StorageStatus = "persisted" | "denied" | "unsupported";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function describeBackup(at: number | null): string {
  if (!at) return "No archive downloaded from this device yet.";
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "Last backup: today.";
  if (days === 1) return "Last backup: yesterday.";
  return `Last backup: ${days} days ago.`;
}

/**
 * "Your data" → device storage row: eviction protection, space used, the last
 * backup age, and the local-cache repair action. The cache is derived data, so
 * rebuilding it never touches the cloud copy or the diary password.
 */
export function LocalDataCard() {
  const { isClientEncrypted, masterKey } = useEncryption();
  const queryClient = useQueryClient();

  const [status, setStatus] = React.useState<StorageStatus | null>(null);
  const [estimate, setEstimate] = React.useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [backupLabel, setBackupLabel] = React.useState(
    "No archive downloaded from this device yet.",
  );
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const refreshStorage = React.useCallback(async () => {
    const [nextStatus, nextEstimate] = await Promise.all([
      getPersistentStorageStatus(),
      getStorageEstimate(),
    ]);
    setStatus(nextStatus);
    setEstimate(nextEstimate);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [nextStatus, nextEstimate] = await Promise.all([
        getPersistentStorageStatus(),
        getStorageEstimate(),
      ]);
      if (cancelled) return;
      setStatus(nextStatus);
      setEstimate(nextEstimate);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const update = () => setBackupLabel(describeBackup(readLastExportAt()));
    update();
    window.addEventListener(BACKUP_RECORDED_EVENT, update);
    return () => window.removeEventListener(BACKUP_RECORDED_EVENT, update);
  }, []);

  const handleProtect = async () => {
    const granted = await requestPersistentStorage();
    await refreshStorage();
    if (granted) {
      toast.success("This device will keep your journal.");
    } else {
      toast.message(
        "Your browser didn't grant storage protection. Keep downloading backups.",
      );
    }
  };

  const handleRebuild = async () => {
    if (!masterKey) {
      toast.error("Unlock your diary to rebuild the cache.");
      return;
    }

    setBusy(true);
    const today = getLocalDateString();
    try {
      // Never discard an edit that has not reached the cloud yet.
      const flush = await diaryCacheService.flushOfflineSyncQueue(
        masterKey,
        today,
      );
      if (flush.failed.length > 0) {
        toast.error(
          "Some changes still need to sync. Reconnect and try rebuilding again.",
        );
        return;
      }

      const rebuilt = await diaryCacheService.rebuildLocalCache(
        masterKey,
        today,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["local-journal"] }),
      ]);

      if (rebuilt) {
        toast.success("Local cache rebuilt from your encrypted cloud copy.");
      } else {
        toast.error(
          "Couldn't rebuild the cache. Check your connection and try again.",
        );
      }
    } catch (error) {
      console.error("Local cache rebuild failed:", error);
      toast.error("Couldn't rebuild the cache. Try again in a moment.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  // The local cache only exists for zero-knowledge accounts.
  if (!isClientEncrypted) {
    return (
      <div className="flex items-start gap-3">
        <HardDrive className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-sm">
          This account saves entries directly to the cloud, so there is no
          on-device cache to protect.
        </p>
      </div>
    );
  }

  const protectedStorage = status === "persisted";
  const statusText =
    status === null
      ? "Checking storage protection…"
      : protectedStorage
        ? "This device has promised to keep your journal."
        : status === "unsupported"
          ? "This browser doesn't report storage protection."
          : "The browser may evict this device's cache under storage pressure.";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-foreground font-serif text-base font-semibold">
          On this device
        </h3>
        <p className="text-muted-foreground text-sm">
          Your journal is encrypted in this browser. Keep it protected and back
          it up; the cloud copy is only as fresh as your last sync.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-border space-y-2 rounded-xl border p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            {protectedStorage ? (
              <ShieldCheck className="text-accent h-4 w-4" />
            ) : (
              <ShieldQuestion className="h-4 w-4" />
            )}
            Storage protection
          </div>
          <p className="text-body-small text-foreground" role="status">
            {statusText}
          </p>
          {status === "denied" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleProtect()}
            >
              Protect this device
            </Button>
          )}
        </div>

        <div className="border-border space-y-2 rounded-xl border p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <HardDrive className="h-4 w-4" />
            Space used
          </div>
          <p className="text-body-small text-foreground">
            {estimate
              ? `${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)} available`
              : "Not reported by this browser."}
          </p>
          <p className="text-muted-foreground text-xs">{backupLabel}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-foreground font-serif text-sm">
            Rebuild local cache
          </p>
          <p className="text-muted-foreground text-xs">
            Re-download your encrypted journal if this device looks out of date.
            Unsynced changes are uploaded first; your password and settings
            stay.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => setConfirmOpen(true)}
          disabled={busy || !masterKey}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rebuilding…
            </>
          ) : (
            "Rebuild cache"
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Rebuild the local cache?"
        description="This replaces the encrypted journal on this device with a fresh copy from the cloud. Unsynced changes are uploaded first. Your diary password, key and preferences are kept."
        confirmLabel="Rebuild cache"
        pending={busy}
        onConfirm={() => void handleRebuild()}
      />
    </div>
  );
}
