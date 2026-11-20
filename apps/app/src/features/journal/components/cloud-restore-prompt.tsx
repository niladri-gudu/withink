"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@withink/ui/card";
import { CloudDownload } from "lucide-react";
import { toast } from "sonner";

import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import { getEntrySyncListAction } from "../actions/entry-actions";
import { useLocalJournal } from "../hooks/use-local-journal";
import { diaryCacheService } from "../services/diary-cache-service";
import { journalSyncService } from "../services/journal-sync-service";

const DISMISS_KEY = "withink-restore-dismissed";

/**
 * New-device restore prompt. Shown only when this browser has no local entries
 * but the account's cloud manifest does (i.e. an empty or failed first pull),
 * so the user has an explicit "restore my journal" action.
 */
export function CloudRestorePrompt() {
  const localToday = getLocalDateString();
  const local = useLocalJournal(localToday);
  const { masterKey } = useEncryption();
  const queryClient = useQueryClient();
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!masterKey || local.isLoading || local.isWarming) return;
    if (local.timeline.length > 0) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    let cancelled = false;
    void getEntrySyncListAction().then((res) => {
      if (cancelled) return;
      if (res.success && res.data && res.data.length > 0) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [masterKey, local.isLoading, local.isWarming, local.timeline.length]);

  if (!show || local.timeline.length > 0) return null;

  const restore = async () => {
    if (!masterKey) return;
    setBusy(true);
    try {
      await diaryCacheService.flushOfflineSyncQueue(masterKey, localToday);
      const ok = await diaryCacheService.syncDiaryCache(masterKey, localToday);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["local-journal"] }),
      ]);
      if (ok) {
        journalSyncService.markSynced();
        toast.success("Journal restored.");
        setShow(false);
      } else {
        toast.error("Restore didn't finish. Try again.");
      }
    } catch {
      toast.error("Restore failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Dismissal is a convenience.
    }
    setShow(false);
  };

  return (
    <Card className="border-border border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 font-serif text-lg font-semibold">
          <CloudDownload className="text-accent h-5 w-5" />
          Your journal is in the cloud
        </CardTitle>
        <CardDescription>
          This device doesn&apos;t have your entries yet. Restore them from your
          encrypted backup.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 pt-0">
        <Button type="button" onClick={restore} disabled={busy}>
          {busy ? "Restoring…" : "Restore journal"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={dismiss}
          disabled={busy}
        >
          Not now
        </Button>
      </CardContent>
    </Card>
  );
}
