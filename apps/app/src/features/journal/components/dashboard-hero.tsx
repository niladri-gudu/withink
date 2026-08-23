import type { Route } from "next";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Calendar, Flame } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { computeCurrentStreak } from "@/lib/utils/date";
import { JournalService } from "@/features/journal/services/journal-service";

import { TodayReflectionCard } from "./today-reflection-card";

interface DashboardHeroProps {
  userId: string;
  today: string;
  yesterday: string;
}

/**
 * Above-the-fold dashboard content (yesterday banner + today's card + streak).
 * Fetches its own data so the page header streams instantly and the hero
 * paints as soon as these reads resolve, instead of blocking on all three
 * before rendering anything.
 */
export async function DashboardHero({
  userId,
  today,
  yesterday,
}: DashboardHeroProps) {
  const [todayEntry, yesterdayEntry, dates] = await Promise.all([
    JournalService.getEntryForDate(userId, today, today),
    JournalService.getEntryForDate(userId, yesterday, today),
    JournalService.getEntryDates(userId),
  ]);

  const currentStreak = computeCurrentStreak(dates, today);
  const yesterdayWritten = !!yesterdayEntry;

  return (
    <>
      {/* Yesterday's Missed Reflection Alert Banner */}
      {!yesterdayWritten && (
        <div className="border-primary/10 bg-primary/5 animate-in slide-in-from-top-2 flex flex-col justify-between gap-4 rounded-xl border p-5 duration-300 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-foreground text-sm font-bold">
                Write Yesterday&apos;s Reflection
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                It looks like you missed writing yesterday. You still have time
                to capture your thoughts before the archive seals.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 cursor-pointer self-end px-5 sm:self-center"
          >
            <Link
              href={`${ROUTES.APP.ENTRY(yesterday)}?today=${today}` as Route}
            >
              Write Yesterday
            </Link>
          </Button>
        </div>
      )}

      {/* Today's page + margin note */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Today's Entry card */}
        <TodayReflectionCard entry={todayEntry} today={today} />

        {/* Day-streak margin note */}
        <div className="border-border flex flex-col justify-between rounded-xl border p-6">
          <p className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
            Margin note
          </p>
          <div className="my-6 flex items-end gap-3">
            <Flame className="text-accent h-6 w-6" />
            <span className="text-foreground font-serif text-5xl leading-none font-bold">
              {currentStreak}
            </span>
            <span className="text-muted-foreground/70 font-hand pb-1 text-lg leading-none">
              day{currentStreak === 1 ? "" : "s"} in a row
            </span>
          </div>
          <p className="text-muted-foreground border-border/60 border-t pt-3 font-serif text-xs leading-relaxed">
            Keep the page open and the ink flowing. Streaks are a quiet record,
            never a demand.
          </p>
        </div>
      </div>
    </>
  );
}

export function DashboardHeroSkeleton() {
  return (
    <>
      {/* Banner placeholder */}
      <div className="bg-muted/40 h-24 animate-pulse rounded-xl border" />
      {/* Today's card + streak note placeholders */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border md:col-span-2" />
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border" />
      </div>
    </>
  );
}
