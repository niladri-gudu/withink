"use client";

import * as React from "react";
import { Card } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";

import type { CachedEntryMetadata } from "@withink/core/timeline";

import { useLocalJournal } from "@/features/journal/hooks/use-local-journal";
import type { DecryptedEntry } from "@/features/journal/services/journal-service";

import {
  readLocalFlashbackHistory,
  selectLocalFlashback,
  writeLocalFlashbackHistory,
} from "../lib/local-flashback";
import { DashboardFlashbackCard } from "./flashback-card-content";

interface DashboardFlashbackLocalProps {
  today: string;
}

function toPlainEntry(
  meta: CachedEntryMetadata | null,
  date: string,
): DecryptedEntry | null {
  if (!meta) return null;
  return {
    id: date,
    userId: "",
    date,
    title: meta.title,
    contentHtml: "",
    contentText: meta.contentText,
    contentJson: {},
    wordCount: meta.wordCount,
    mood: meta.mood,
    notebookId: meta.notebookId ?? null,
    createdAt: new Date(meta.createdAt ?? meta.updatedAt),
    updatedAt: new Date(meta.updatedAt),
  };
}

/**
 * Local-first dashboard flashback: selects from the decrypted IndexedDB
 * timeline, mirroring the server's anniversary-first / recently-unseen rules.
 */
export function DashboardFlashbackLocal({
  today,
}: DashboardFlashbackLocalProps) {
  const local = useLocalJournal(today);
  const dates = React.useMemo(
    () => local.timeline.map((entry) => entry.date),
    [local.timeline],
  );
  const [history] = React.useState(() => readLocalFlashbackHistory());

  const { pick } = React.useMemo(
    () => selectLocalFlashback(dates, today, history),
    [dates, today, history],
  );

  // Rotate the device-local "recently shown" list after render, never during.
  React.useEffect(() => {
    if (!pick) return;
    writeLocalFlashbackHistory([
      pick.date,
      ...history.filter((date) => date !== pick.date),
    ]);
  }, [pick, history]);

  const entry = React.useMemo(() => {
    if (!pick) return null;
    const meta =
      local.timeline.find((item) => item.date === pick.date) ?? null;
    return toPlainEntry(meta, pick.date);
  }, [pick, local.timeline]);

  if (local.isLoading) {
    return (
      <Card className="border-border border p-6">
        <div className="space-y-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    );
  }

  return (
    <DashboardFlashbackCard
      entry={entry}
      label={pick?.label ?? ""}
      today={today}
      plaintext
    />
  );
}
