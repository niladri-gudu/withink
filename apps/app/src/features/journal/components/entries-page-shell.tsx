"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { EntriesControls, type TimeFilter } from "./entries-controls";
import { EntriesFolio } from "./entries-folio";
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
  /** Viewer's plan backfill window (days); Infinity = unlimited. */
  backfillDays: number;
  /** The viewer's notebooks (id + name), default first. */
  notebooks: { id: string; name: string }[];
  /** Notebook scope resolved server-side from ?notebook= (deep links). */
  initialNotebookFilter?: string;
}

export function EntriesPageShell({
  initialEntries,
  initialTotal,
  initialCalendarEntries,
  initialStreakData,
  localToday,
  accountEncrypted,
  backfillDays,
  notebooks,
  initialNotebookFilter = "all",
}: EntriesPageShellProps) {
  const router = useRouter();
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>(
    initialCalendarEntries,
  );
  const [streakData, setStreakData] = useState(initialStreakData);

  // Search + filters live at the page level so the sticky controls bar can sit
  // above both the calendar (phones) and the timeline in one DOM flow.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [notebookFilter, setNotebookFilter] = useState(initialNotebookFilter);

  // Mirror the notebook scope into the URL (replace, no history spam) so a
  // scoped view stays deep-linkable, refresh-safe, and back-button-friendly.
  useEffect(() => {
    const qs = notebookFilter !== "all" ? `?notebook=${notebookFilter}` : "";
    router.replace(
      `${ROUTES.APP.ENTRIES}${qs}` as Parameters<typeof router.replace>[0],
      {
        scroll: false,
      },
    );
  }, [notebookFilter, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      clearTimeout(handler);
    };
  }, [search]);

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
                `${ROUTES.APP.ENTRY(localToday)}?today=${localToday}${
                  notebookFilter !== "all" ? `&notebook=${notebookFilter}` : ""
                }` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]
              }
            >
              <Plus className="h-4 w-4" />
              <span>New Entry</span>
            </Link>
          </Button>
        }
      />

      {/* Phone-first: single column — sticky search → month pager → folio row
          → timeline (order utilities; at lg both columns are explicitly
          placed, so the desktop grid ignores them). */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        {/* Calendar column: inline below search on phones; sticky rail on lg+.
            gap (not space-y) so the 24px follows VISUAL order — lg:order swaps
            the folio above the calendar, and space-y margins follow DOM order. */}
        <div className="order-1 flex flex-col gap-6 lg:sticky lg:top-24 lg:order-none lg:col-start-1 lg:row-start-1">
          <EntriesCalendar
            calendarEntries={calendarEntries}
            localToday={localToday}
            backfillDays={backfillDays}
            className="lg:order-2"
          />
          <EntriesFolio streakData={streakData} className="lg:order-1" />
        </div>

        {/* Timeline column: search pinned at top, list flows after the pager */}
        <div className="order-2 space-y-6 lg:order-none lg:col-span-2 lg:col-start-2 lg:row-start-1">
          <EntriesControls
            search={search}
            onSearchChange={setSearch}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            moodFilter={moodFilter}
            onMoodFilterChange={setMoodFilter}
            notebookFilter={notebookFilter}
            onNotebookFilterChange={setNotebookFilter}
            notebooks={notebooks}
          />
          <EntriesTimeline
            initialEntries={initialEntries}
            initialTotal={initialTotal}
            localToday={localToday}
            accountEncrypted={accountEncrypted}
            debouncedSearch={debouncedSearch}
            moodFilter={moodFilter}
            timeFilter={timeFilter}
            notebookFilter={notebookFilter}
            notebooks={notebooks}
            onEntryDeleted={handleEntryDeleted}
          />
        </div>
      </div>
    </div>
  );
}
