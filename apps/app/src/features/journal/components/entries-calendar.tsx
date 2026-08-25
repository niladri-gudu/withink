"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@withink/ui/card";
import { IconButton } from "@withink/ui/icon-button";
import { cn } from "@withink/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import { backfillWindowStart } from "@/lib/utils/date";

import type { CalendarEntry } from "../actions/entry-actions";

interface EntriesCalendarProps {
  calendarEntries: CalendarEntry[];
  localToday: string;
  /** Viewer's plan backfill window (days); Infinity = unlimited. */
  backfillDays: number;
  className?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const moodCellClasses: Record<number, string> = {
  1: "bg-mood-1-bg border-mood-1-border hover:bg-mood-1/30 text-mood-1",
  2: "bg-mood-2-bg border-mood-2-border hover:bg-mood-2/30 text-mood-2",
  3: "bg-mood-3-bg border-mood-3-border hover:bg-mood-3/20 text-mood-3",
  4: "bg-mood-4-bg border-mood-4-border hover:bg-mood-4/30 text-mood-4",
  5: "bg-mood-5-bg border-mood-5-border hover:bg-mood-5/30 text-mood-5",
};

/**
 * The month pager. Phones read it as a compact strip directly under the
 * sticky search — chevron pagers are 44px touch targets and any tappable day
 * opens that page in the editor; md+ keeps the original mood-colored month
 * grid presentation inside the sticky rail.
 */
export function EntriesCalendar({
  calendarEntries,
  localToday,
  backfillDays,
  className,
}: EntriesCalendarProps) {
  const router = useRouter();

  // Rebuild lookup maps only when the underlying data changes (month navigation
  // re-renders many cells; we don't want to rebuild these per cell per render).
  const { entryMap, dateSet } = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    calendarEntries.forEach((entry) => {
      map.set(entry.date, entry);
    });
    return {
      entryMap: map,
      dateSet: new Set(calendarEntries.map((e) => e.date)),
    };
  }, [calendarEntries]);

  // Oldest creatable date for the viewer's plan (null = unlimited, Pro).
  // Computed once per (today, plan) pair; shared by the click handler and
  // every rendered cell.
  const windowStartStr = useMemo(
    () => backfillWindowStart(localToday, backfillDays),
    [localToday, backfillDays],
  );

  const [todayYear, todayMonth] = localToday.split("-").map(Number);
  const [currentYear, setCurrentYear] = useState(
    todayYear || new Date().getFullYear(),
  );
  const [currentMonth, setCurrentMonth] = useState(
    todayMonth !== undefined ? todayMonth - 1 : new Date().getMonth(),
  );
  // Gate #1 paywall: clicking a sealed (out-of-window) empty day opens the
  // upgrade dialog — the dead cell becomes the upsell moment.
  const [backfillPaywallOpen, setBackfillPaywallOpen] = useState(false);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Generate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = [];
  // Padding slots
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasEntry = dateSet.has(dateStr);
    const isFuture = dateStr > localToday;
    const isExpired = windowStartStr !== null && dateStr < windowStartStr;

    if (isFuture) {
      return; // Locked future day
    }

    if (isExpired && !hasEntry) {
      // Sealed past day → paywall moment (Gate #1).
      setBackfillPaywallOpen(true);
      return;
    }

    router.push(
      (ROUTES.APP.ENTRY(dateStr) +
        "?today=" +
        localToday) as unknown as Parameters<typeof router.push>[0],
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Calendar Card */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        Showing {MONTH_NAMES[currentMonth]} {currentYear}
      </span>
      <Card className="border-border border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col">
            <span className="text-running-head text-muted-foreground/60">
              The year, kept in order
            </span>
            <CardTitle className="text-foreground font-serif text-xl font-semibold">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              variant="outline"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="outline"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_NAMES.map((day) => (
              <span
                key={day}
                className="text-muted-foreground/50 py-1 font-serif text-[11px] font-semibold tracking-[0.16em] uppercase"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEntry = entryMap.get(dateStr);
              const hasEntry = !!dayEntry;
              const isToday = dateStr === localToday;
              // The writing window is the plan's backfill entitlement;
              // existing entries stay clickable at any age. Sealed days
              // respond too — with the upgrade dialog instead of navigation.
              const isFuture = dateStr > localToday;
              const isExpired =
                windowStartStr !== null && dateStr < windowStartStr;
              const isSealed = isExpired && !hasEntry;
              const isClickable = !isFuture;

              let cellColorClass = "";
              if (hasEntry) {
                const mood = dayEntry?.mood;
                cellColorClass = cn(
                  mood && moodCellClasses[mood]
                    ? moodCellClasses[mood]
                    : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20",
                  "hover:scale-105 border",
                );
              } else if (isSealed) {
                cellColorClass =
                  "text-muted-foreground/25 hover:text-muted-foreground/50 border border-transparent hover:scale-105";
              } else if (isClickable) {
                cellColorClass =
                  "bg-secondary/15 hover:bg-secondary/40 border border-border/10 text-muted-foreground/60 hover:scale-105";
              } else {
                cellColorClass =
                  "text-muted-foreground/20 cursor-not-allowed select-none border border-transparent";
              }

              const dayLabel = isFuture
                ? `Locked date: ${dateStr}`
                : isSealed
                  ? `Writing window ended before ${dateStr} — upgrade to write earlier`
                  : hasEntry
                    ? `Reflection written on ${dateStr}${dayEntry?.mood ? ` • Mood: ${dayEntry.mood}` : ""}`
                    : `Write entry for ${dateStr}`;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={!isClickable}
                  aria-label={dayLabel}
                  className={cn(
                    "focus-visible:ring-ring relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    isClickable && "cursor-pointer",
                    isToday && "ring-primary font-bold ring-2 ring-offset-2",
                    cellColorClass,
                  )}
                  title={
                    isFuture
                      ? "Future locked"
                      : isSealed
                        ? "Beyond your writing window"
                        : hasEntry
                          ? `Reflection written on ${dateStr}${dayEntry?.mood ? ` (${dayEntry.mood}/5)` : ""}`
                          : `Write entry for ${dateStr}`
                  }
                >
                  <span className="relative z-10" aria-hidden="true">
                    {day}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Heatmap Legend */}
          <div className="text-muted-foreground/60 mt-4 flex items-center justify-end gap-1.5 font-serif text-[9px] uppercase">
            <span>Less</span>
            <div
              className="bg-secondary/15 border-border/10 h-2.5 w-2.5 rounded-[3px] border"
              title="No Entry"
            />
            <div
              className="bg-mood-2-bg border-mood-2-border h-2.5 w-2.5 rounded-[3px]"
              title="Sad Mood"
            />
            <div
              className="bg-mood-3-bg border-mood-3-border h-2.5 w-2.5 rounded-[3px]"
              title="Neutral Mood"
            />
            <div
              className="bg-mood-4-bg border-mood-4-border h-2.5 w-2.5 rounded-[3px]"
              title="Happy Mood"
            />
            <div
              className="bg-mood-5-bg border-mood-5-border h-2.5 w-2.5 rounded-[3px]"
              title="Radiant Mood"
            />
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      <UpgradeDialog
        open={backfillPaywallOpen}
        onOpenChange={setBackfillPaywallOpen}
        reason="backfill"
      />
    </div>
  );
}
