"use client";

import * as React from "react";

import type { CachedEntryMetadata } from "@withink/core/timeline";

import { useLocalJournal } from "../hooks/use-local-journal";
import type { DecryptedEntry } from "../services/journal-service";

import { DashboardHeroSkeleton } from "./dashboard-hero-skeleton";
import { StreakMarginNote } from "./streak-margin-note";
import { TodayReflectionCard } from "./today-reflection-card";
import { YesterdayBanner } from "./yesterday-banner";

interface DashboardHeroLocalProps {
  today: string;
  yesterday: string;
}

/** Adapts a decrypted local metadata record to the card's entry shape. */
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
 * Local-first hero: identical layout to the server hero, but today/yesterday
 * and the streak come from the decrypted IndexedDB timeline. A warm cache
 * renders immediately; a cold cache shows the hero skeleton while the
 * background pull fills IndexedDB.
 */
export function DashboardHeroLocal({
  today,
  yesterday,
}: DashboardHeroLocalProps) {
  const local = useLocalJournal(today);

  const todayMeta =
    local.timeline.find((entry) => entry.date === today) ?? null;
  const yesterdayMeta =
    local.timeline.find((entry) => entry.date === yesterday) ?? null;

  const todayEntry = React.useMemo(
    () => toPlainEntry(todayMeta, today),
    [todayMeta, today],
  );

  if (local.isLoading) {
    return <DashboardHeroSkeleton />;
  }

  return (
    <>
      {!yesterdayMeta && (
        <YesterdayBanner yesterday={yesterday} today={today} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <TodayReflectionCard entry={todayEntry} today={today} plaintext />
        <StreakMarginNote currentStreak={local.streakData.currentStreak} />
      </div>
    </>
  );
}
