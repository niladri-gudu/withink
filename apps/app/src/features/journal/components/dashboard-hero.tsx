import { Flame } from "lucide-react";

import { computeCurrentStreak } from "@/lib/utils/date";
import { JournalService } from "@/features/journal/services/journal-service";

import { TodayReflectionCard } from "./today-reflection-card";
import { YesterdayBanner } from "./yesterday-banner";

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
      {/* Yesterday's missed reflection — calm, dismissible, client-owned */}
      {!yesterdayWritten && (
        <YesterdayBanner yesterday={yesterday} today={today} />
      )}

      {/* Today's page + margin note */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Today's Entry card */}
        <TodayReflectionCard entry={todayEntry} today={today} />

        {/* Day-streak margin note */}
        <div className="border-border flex flex-col justify-between rounded-xl border p-6">
          <p className="text-running-head text-muted-foreground/70">
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
      {/* Today's card + streak margin-note placeholders. The yesterday banner
          is data-dependent, so no placeholder — it streams in without a
          reserved box to avoid a layout jump when absent. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border md:col-span-2" />
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border" />
      </div>
    </>
  );
}
