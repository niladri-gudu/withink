"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Plus } from "lucide-react";

import { ROUTES } from "@/constants/routes";

import {
  getCalendarEntriesAction,
  getStreakAndStatsAction,
  type CalendarEntry,
} from "../actions/entry-actions";
import type { DecryptedEntry } from "../services/journal-service";
import { EntriesCalendar } from "./entries-calendar";
import { EntriesTimeline } from "./entries-timeline";

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
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>(
    initialCalendarEntries,
  );
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
    <div className="animate-in fade-in mx-auto w-full max-w-5xl flex-1 space-y-8 p-6 duration-300 md:p-10">
      {/* Page Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-muted-foreground/60 block font-mono text-[10px] tracking-[0.25em] uppercase">
            Archives Index • History
          </span>
          <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
            All{" "}
            <span className="text-primary mt-1 block pl-1 text-4xl font-light italic sm:mt-0 sm:inline sm:text-5xl">
              reflections.
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            Browse and search your journal history
          </p>
        </div>

        <Button asChild className="cursor-pointer gap-2 rounded-full shadow-sm">
          <Link
            href={
              `${ROUTES.APP.ENTRY(localToday)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<
                typeof Link
              >["href"]
            }
          >
            <Plus className="h-4 w-4" />
            <span>New Entry</span>
          </Link>
        </Button>
      </header>

      {/* Main Grid: Calendar & Timeline */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        {/* Left Column: Calendar & Stats (1/3 width) */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-1">
          <EntriesCalendar
            calendarEntries={calendarEntries}
            streakData={streakData}
            localToday={localToday}
          />
        </div>

        {/* Right Column: Timeline List (2/3 width) */}
        <div className="space-y-6 lg:col-span-2">
          <div className="relative">
            {/* Visual vertical timeline line (connecting items) */}
            <div className="bg-border/10 absolute top-6 bottom-0 left-[-20px] hidden w-[2px] lg:block" />
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
