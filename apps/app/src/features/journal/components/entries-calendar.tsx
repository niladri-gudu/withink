"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@withink/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@withink/ui/card";
import { cn } from "@withink/utils";
import {
  Book,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  Sparkles,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { addDays } from "@/lib/utils/date";

import type { CalendarEntry } from "../actions/entry-actions";

interface EntriesCalendarProps {
  calendarEntries: CalendarEntry[];
  streakData: {
    currentStreak: number;
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  };
  localToday: string;
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

export function EntriesCalendar({
  calendarEntries,
  streakData,
  localToday,
}: EntriesCalendarProps) {
  const router = useRouter();

  const entryMap = new Map<string, CalendarEntry>();
  calendarEntries.forEach((entry) => {
    entryMap.set(entry.date, entry);
  });
  const dateSet = new Set(calendarEntries.map((e) => e.date));

  const [todayYear, todayMonth] = localToday.split("-").map(Number);
  const [currentYear, setCurrentYear] = useState(
    todayYear || new Date().getFullYear(),
  );
  const [currentMonth, setCurrentMonth] = useState(
    todayMonth !== undefined ? todayMonth - 1 : new Date().getMonth(),
  );

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
    const yesterdayStr = addDays(localToday, -1);
    const hasEntry = dateSet.has(dateStr);
    const isFuture = dateStr > localToday;
    const isExpired = dateStr < yesterdayStr;

    if (isFuture) {
      return; // Locked future day
    }

    if (isExpired && !hasEntry) {
      return; // Sealed past day
    }

    router.push(
      (ROUTES.APP.ENTRY(dateStr) +
        "?today=" +
        localToday) as unknown as Parameters<typeof router.push>[0],
    );
  };

  return (
    <div className="space-y-6">
      {/* Consistency Metrics Card */}
      <Card
        className="border-border bg-card/60 relative overflow-hidden border backdrop-blur-md"
        interactive
      >
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-orange-400 via-amber-500 to-emerald-500" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-primary h-4 w-4 animate-pulse" />
            Sanctuary Metrics
          </CardTitle>
          <CardDescription>Your alignment and consistency</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 pt-2">
          <div className="bg-muted/20 border-border/10 flex flex-col items-center rounded-xl border p-3 text-center">
            <Flame
              className={cn(
                "mb-1 h-6 w-6 text-orange-500",
                streakData.currentStreak > 0 && "animate-bounce",
              )}
            />
            <span className="text-foreground font-serif text-2xl font-bold">
              {streakData.currentStreak}
            </span>
            <span className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
              Streak
            </span>
          </div>

          <div className="bg-muted/20 border-border/10 flex flex-col items-center rounded-xl border p-3 text-center">
            <Book className="text-primary mb-1 h-6 w-6" />
            <span className="text-foreground font-serif text-2xl font-bold">
              {streakData.totalEntries}
            </span>
            <span className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
              Logs
            </span>
          </div>

          <div className="bg-muted/20 border-border/10 flex flex-col items-center rounded-xl border p-3 text-center">
            <Scale className="mb-1 h-6 w-6 text-emerald-500" />
            <span className="text-foreground font-serif text-2xl font-bold">
              {streakData.averageWords}
            </span>
            <span className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
              Avg Words
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Card */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        Showing {MONTH_NAMES[currentMonth]} {currentYear}
      </span>
      <Card className="border-border bg-card/60 border backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col">
            <span className="text-muted-foreground/60 font-mono text-xs tracking-wider uppercase">
              Sanctuary Calendar
            </span>
            <CardTitle className="text-foreground font-serif text-xl font-semibold">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="focus-visible:ring-ring h-8 w-8 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="focus-visible:ring-ring h-8 w-8 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_NAMES.map((day) => (
              <span
                key={day}
                className="text-muted-foreground/50 py-1 font-mono text-[10px] font-semibold tracking-widest uppercase"
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
              const yesterdayStr = addDays(localToday, -1);
              const isFuture = dateStr > localToday;
              const isExpired = dateStr < yesterdayStr;
              const isClickable = !isFuture && (!isExpired || hasEntry);

              let cellColorClass = "";
              if (hasEntry) {
                const mood = dayEntry?.mood;
                cellColorClass = cn(
                  mood && moodCellClasses[mood]
                    ? moodCellClasses[mood]
                    : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20",
                  "hover:scale-105 border",
                );
              } else if (isClickable) {
                cellColorClass =
                  "bg-secondary/15 hover:bg-secondary/40 border border-border/10 text-muted-foreground/60 hover:scale-105";
              } else {
                cellColorClass =
                  "text-muted-foreground/20 cursor-not-allowed select-none border border-transparent";
              }

              const dayLabel = isFuture
                ? `Locked date: ${dateStr}`
                : isExpired && !hasEntry
                  ? `Expired date: ${dateStr}`
                  : hasEntry
                    ? `Reflection written on ${dateStr}${dayEntry?.mood ? ` • Mood: ${dayEntry.mood}` : ""}`
                    : `Write entry for ${dateStr}`;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => isClickable && handleDayClick(day)}
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
                      : isExpired && !hasEntry
                        ? "Grace period expired"
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
          <div className="text-muted-foreground/60 mt-4 flex items-center justify-end gap-1.5 font-mono text-[9px] uppercase">
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
    </div>
  );
}
