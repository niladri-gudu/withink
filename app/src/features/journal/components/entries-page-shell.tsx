"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { EntriesCalendar } from "./entries-calendar";
import { EntriesTimeline } from "./entries-timeline";
import { getCalendarEntriesAction, getStreakAndStatsAction } from "../actions/entry-actions";
import type { CalendarEntry } from "../actions/entry-actions";
import type { DecryptedEntry } from "../services/journal-service";

interface EntriesPageShellProps {
  initialEntries: DecryptedEntry[];
  initialTotal: number;
  initialCalendarEntries: CalendarEntry[];
  initialStreakData: {
    currentStreak: number;
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  };
  localToday: string;
}

export function EntriesPageShell({
  initialEntries,
  initialTotal,
  initialCalendarEntries,
  initialStreakData,
  localToday,
}: EntriesPageShellProps) {
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>(initialCalendarEntries);
  const [streakData, setStreakData] = useState(initialStreakData);

  const handleEntryDeleted = async () => {
    // Re-fetch calendar dates and streak stats asynchronously
    const [resDates, resStats] = await Promise.all([
      getCalendarEntriesAction(),
      getStreakAndStatsAction(localToday),
    ]);

    if (resDates.success && resDates.data) {
      setCalendarEntries(resDates.data);
    }
    if (resStats.success && resStats.data) {
      setStreakData(resStats.data);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      {/* Page Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
            Archives Index • History
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">
            All{" "}
            <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
              reflections.
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            Browse and search your journal history
          </p>
        </div>

        <Button asChild className="rounded-full gap-2 cursor-pointer shadow-sm">
          <Link href={`${ROUTES.APP.ENTRY(localToday)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
            <Plus className="h-4 w-4" />
            <span>New Entry</span>
          </Link>
        </Button>
      </header>

      {/* Main Grid: Calendar & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Calendar & Stats (1/3 width) */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          <EntriesCalendar
            calendarEntries={calendarEntries}
            streakData={streakData}
            localToday={localToday}
          />
        </div>

        {/* Right Column: Timeline List (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            {/* Visual vertical timeline line (connecting items) */}
            <div className="absolute left-[-20px] top-6 bottom-0 w-[2px] bg-border/10 hidden lg:block" />
            <EntriesTimeline
              initialEntries={initialEntries}
              initialTotal={initialTotal}
              localToday={localToday}
              onEntryDeleted={handleEntryDeleted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
