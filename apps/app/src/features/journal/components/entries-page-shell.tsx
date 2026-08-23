"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Plus } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/features/app-shell/components/page-header";

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
  accountEncrypted: boolean;
}

export function EntriesPageShell({
  initialEntries,
  initialTotal,
  initialCalendarEntries,
  initialStreakData,
  localToday,
  accountEncrypted,
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
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      {/* Page Header */}
      <PageHeader
        runningHead="Entries"
        note="the archive, kept in order"
        title="All"
        accent="reflections."
        description="Browse and search your journal history"
        today={localToday}
        action={
          <Button asChild className="cursor-pointer gap-2">
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
        }
      />

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
            <EntriesTimeline
              initialEntries={initialEntries}
              initialTotal={initialTotal}
              localToday={localToday}
              accountEncrypted={accountEncrypted}
              onEntryDeleted={handleEntryDeleted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
