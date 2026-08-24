"use client";

import { useMemo, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { IconButton } from "@withink/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@withink/ui/popover";
import { cn } from "@withink/utils";
import {
  Angry,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Frown,
  Meh,
  Smile,
  SmilePlus,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";

interface HeatmapDay {
  date: string;
  count: number;
  wordCount: number;
  mood: number | null;
}

interface CalendarHeatmapProps {
  heatmap: HeatmapDay[];
  /** Viewer-local today, used to build entry links. */
  localToday: string;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Angry",
  2: "Sad",
  3: "Neutral",
  4: "Happy",
  5: "Radiant",
};

const MOOD_ICONS: Record<
  number,
  React.ComponentType<{ className?: string }>
> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: SmilePlus,
};

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Replaces the old GitHub-style 365-day strip (min-w-[760px] horizontal scroll
 * with hover-only tooltips — unreachable on touch) with a month-by-month
 * pager: chevron paging, one month of intensity dots at a time, and every
 * written day tappable into a Popover with its words/mood and an entry link.
 * No min-width, no pinch, no dead tooltips.
 */
export function CalendarHeatmap({ heatmap, localToday }: CalendarHeatmapProps) {
  const byDate = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    heatmap.forEach((day) => map.set(day.date, day));
    return map;
  }, [heatmap]);

  // Months covered by the data window (oldest → newest), used to bound paging.
  const months = useMemo(() => {
    if (!heatmap || heatmap.length === 0) return [];
    const keys = new Set(heatmap.map((day) => day.date.slice(0, 7)));
    return [...keys].sort();
  }, [heatmap]);

  const [monthIndex, setMonthIndex] = useState(() =>
    Math.max(0, months.length - 1),
  );

  // Data windows can shrink after a refetch; clamp back into range.
  const safeIndex = Math.min(monthIndex, Math.max(0, months.length - 1));
  const activeMonth = months[safeIndex];

  const daysInActiveMonth = useMemo(() => {
    if (!activeMonth) return [];
    const [year, month] = activeMonth.split("-").map(Number);
    const total = new Date(year!, month!, 0).getDate();
    const leading = new Date(year!, month! - 1, 1).getDay();
    const cells: (HeatmapDay | null)[] = Array(leading).fill(null);
    for (let day = 1; day <= total; day++) {
      const dateStr = `${activeMonth}-${String(day).padStart(2, "0")}`;
      cells.push(byDate.get(dateStr) ?? null);
    }
    return cells;
  }, [activeMonth, byDate]);

  if (!activeMonth || heatmap.length === 0) return null;

  const monthLabel = new Date(
    Number(activeMonth.slice(0, 4)),
    Number(activeMonth.slice(5, 7)) - 1,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthDays = daysInActiveMonth.filter(Boolean) as HeatmapDay[];
  const monthEntries = monthDays.filter((day) => day.count > 0);
  const monthWords = monthEntries.reduce((sum, day) => sum + day.wordCount, 0);

  return (
    <div className="flex flex-col items-center">
      {/* Month pager */}
      <div className="flex w-full items-center justify-between gap-2">
        <IconButton
          variant="outline"
          size="sm"
          onClick={() => setMonthIndex((idx) => Math.max(0, idx - 1))}
          disabled={safeIndex === 0}
          aria-label={`Previous month (${safeIndex > 0 ? monthNameFor(months[safeIndex - 1]!) : "none"})`}
        >
          <ChevronLeft className="h-4 w-4" />
        </IconButton>

        <div className="text-center">
          <p className="text-foreground font-serif text-lg font-semibold tracking-tight">
            {monthLabel}
          </p>
          <p className="text-muted-foreground/60 font-serif text-[11px] uppercase tracking-[0.16em]">
            {monthEntries.length}{" "}
            {monthEntries.length === 1 ? "reflection" : "reflections"} ·{" "}
            {monthWords.toLocaleString()} words
          </p>
        </div>

        <IconButton
          variant="outline"
          size="sm"
          onClick={() =>
            setMonthIndex((idx) => Math.min(months.length - 1, idx + 1))
          }
          disabled={safeIndex >= months.length - 1}
          aria-label={`Next month (${safeIndex < months.length - 1 ? monthNameFor(months[safeIndex + 1]!) : "none"})`}
        >
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>

      {/* Weekday header */}
      <div
        aria-hidden="true"
        className="text-muted-foreground/50 mt-4 grid w-full max-w-[21rem] grid-cols-7 gap-1.5 text-center font-serif text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {WEEKDAY_HEADERS.map((label, idx) => (
          <span key={`${label}-${idx}`}>{label}</span>
        ))}
      </div>

      {/* Day grid — every written day opens its detail on tap */}
      <div className="mt-1.5 grid w-full max-w-[21rem] grid-cols-7 gap-1.5">
        {daysInActiveMonth.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} aria-hidden="true" />;
          }

          const hasEntry = day.count > 0;

          if (!hasEntry) {
            return (
              <div
                key={day.date}
                title={`${formatShort(day.date)} · No reflection`}
                className="bg-muted/15 dark:bg-muted/10 aspect-square rounded-md border border-transparent"
              />
            );
          }

          return (
            <Popover key={day.date}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${formatFull(day.date)}: ${day.wordCount} words${day.mood ? `, mood ${MOOD_LABELS[day.mood]}` : ""}. View details.`}
                  className={cn(
                    "focus-visible:ring-ring aspect-square cursor-pointer rounded-md border text-[10px] font-semibold transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    getIntensityClass(day),
                  )}
                >
                  <span className="tabular-nums">
                    {Number(day.date.slice(8, 10))}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-60">
                <DayDetail day={day} localToday={localToday} />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {/* Legend */}
      <div className="text-muted-foreground/60 mt-4 flex items-center gap-2 font-serif text-[10px] uppercase">
        <span>Less</span>
        <div className="bg-muted/15 h-[10px] w-[10px] rounded-[2px] border border-transparent" />
        <div className="border-accent/15 bg-accent/25 dark:bg-accent/20 h-[10px] w-[10px] rounded-[2px] border" />
        <div className="border-accent/25 bg-accent/45 dark:bg-accent/35 h-[10px] w-[10px] rounded-[2px] border" />
        <div className="border-accent/40 bg-accent/70 dark:bg-accent/55 h-[10px] w-[10px] rounded-[2px] border" />
        <div className="border-accent bg-accent h-[10px] w-[10px] rounded-[2px] border" />
        <span>More</span>
      </div>
    </div>
  );
}

function DayDetail({
  day,
  localToday,
}: {
  day: HeatmapDay;
  localToday: string;
}) {
  const MoodIcon = day.mood ? MOOD_ICONS[day.mood] : null;

  return (
    <div className="space-y-2">
      <p className="text-foreground font-serif text-sm font-semibold">
        {formatFull(day.date)}
      </p>
      <p className="text-body-small text-muted-foreground flex items-center gap-2">
        <span>{day.wordCount.toLocaleString()} words</span>
        {MoodIcon && day.mood && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <MoodIcon className="text-accent h-3.5 w-3.5" />
              {MOOD_LABELS[day.mood]}
            </span>
          </>
        )}
      </p>
      <Link
        href={
          `${ROUTES.APP.ENTRY(day.date)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<
            typeof Link
          >["href"]
        }
        className="text-primary hover:text-accent inline-flex items-center gap-1 font-serif text-xs font-semibold underline underline-offset-4"
      >
        Open this reflection
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function getIntensityClass(dayData: HeatmapDay): string {
  const wc = dayData.wordCount;
  // Ink-on-gold (accent-foreground) stays ≥4.5:1 on every step, so the
  // day numerals never trade legibility for intensity.
  if (wc < 100) {
    return "bg-accent/45 border-accent/25 text-foreground dark:bg-accent/35 dark:border-accent/15 hover:bg-accent/60";
  }
  if (wc < 300) {
    return "bg-accent/65 border-accent/30 text-foreground dark:bg-accent/55 dark:border-accent/20 hover:bg-accent/80";
  }
  if (wc < 600) {
    return "bg-accent/85 border-accent/40 text-accent-foreground dark:bg-accent/75 dark:border-accent/25";
  }
  return "bg-accent border-accent text-accent-foreground";
}

function monthNameFor(monthKey: string): string {
  return new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)) - 1,
    1,
  ).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
