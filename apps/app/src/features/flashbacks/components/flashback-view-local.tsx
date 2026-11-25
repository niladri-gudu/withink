"use client";

import * as React from "react";

import { useEncryption } from "@/providers/encryption-provider";
import { useLocalJournal } from "@/features/journal/hooks/use-local-journal";
import { diaryCacheService } from "@/features/journal/services/diary-cache-service";

import {
  readLocalFlashbackHistory,
  selectLocalFlashback,
  writeLocalFlashbackHistory,
} from "../lib/local-flashback";
import {
  FlashbackReader,
  type FlashbackDisplayEntry,
} from "./flashback-reader";

interface FlashbackViewLocalProps {
  localToday: string;
}

/**
 * Local-first flashback for zero-knowledge accounts: selects the memory from
 * the decrypted timeline (anniversary-first, then a daily-stable archive pick)
 * and reads the rich document from IndexedDB. No server read, works offline.
 */
export function FlashbackViewLocal({ localToday }: FlashbackViewLocalProps) {
  const { masterKey } = useEncryption();
  const local = useLocalJournal(localToday);

  const dates = React.useMemo(
    () => local.timeline.map((entry) => entry.date),
    [local.timeline],
  );

  // Seed the "recently shown" list once; refreshes append to it so a second
  // memory is always a different one (when one exists).
  const [seed] = React.useState(() => readLocalFlashbackHistory());
  const [extra, setExtra] = React.useState<string[]>([]);
  const excluded = React.useMemo(
    () => [...extra, ...seed],
    [extra, seed],
  );

  const { pick } = React.useMemo(
    () => selectLocalFlashback(dates, localToday, excluded),
    [dates, localToday, excluded],
  );

  // Rotate the device-local history after render, never during.
  React.useEffect(() => {
    if (!pick) return;
    writeLocalFlashbackHistory([pick.date, ...seed]);
  }, [pick, seed]);

  const meta = React.useMemo(() => {
    if (!pick) return null;
    return local.timeline.find((entry) => entry.date === pick.date) ?? null;
  }, [pick, local.timeline]);

  // `contentHtml` lives in the document store, not the timeline metadata.
  // Key the loaded HTML by date so a changed pick never shows the previous
  // memory's rich text under a new title.
  const [loadedDoc, setLoadedDoc] = React.useState<{
    date: string;
    html: string;
  } | null>(null);

  React.useEffect(() => {
    if (!pick || !masterKey) return;
    let cancelled = false;
    void diaryCacheService
      .getLocalDocument(pick.date, masterKey)
      .then((doc) => {
        if (!cancelled) {
          setLoadedDoc({ date: pick.date, html: doc?.contentHtml ?? "" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pick, masterKey]);

  const display = React.useMemo<FlashbackDisplayEntry | null>(() => {
    if (!meta) return null;
    return {
      date: meta.date,
      title: meta.title,
      contentText: meta.contentText,
      contentHtml:
        loadedDoc && loadedDoc.date === meta.date ? loadedDoc.html : "",
      mood: meta.mood,
      wordCount: meta.wordCount,
    };
  }, [meta, loadedDoc]);

  const loading =
    !local.isLocal ||
    local.isLoading ||
    (local.isWarming && local.timeline.length === 0);

  const handleRefresh = React.useCallback(() => {
    if (!pick) return;
    setExtra((previous) => [pick.date, ...previous]);
  }, [pick]);

  return (
    <FlashbackReader
      entry={display}
      label={pick?.label ?? ""}
      localToday={localToday}
      loading={loading}
      onRefresh={handleRefresh}
    />
  );
}
