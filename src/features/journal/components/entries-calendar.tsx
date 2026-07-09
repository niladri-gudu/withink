"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flame, Book, Sparkles, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { addDays } from "@/lib/utils/date";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EntriesCalendarProps {
  writtenDates: string[];
  streakData: {
    currentStreak: number;
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  };
  localToday: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function EntriesCalendar({
  writtenDates,
  streakData,
  localToday,
}: EntriesCalendarProps) {
  const router = useRouter();
  const dateSet = new Set(writtenDates);

  const [todayYear, todayMonth] = localToday.split("-").map(Number);
  const [currentYear, setCurrentYear] = useState(todayYear || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(
    (todayMonth !== undefined ? todayMonth - 1 : new Date().getMonth())
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

    router.push((ROUTES.APP.ENTRY(dateStr) + "?today=" + localToday) as unknown as Parameters<typeof router.push>[0]);
  };

  return (
    <div className="space-y-6">
      {/* Consistency Metrics Card */}
      <Card className="overflow-hidden border border-border bg-card/60 backdrop-blur-md relative" interactive>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-400 via-amber-500 to-emerald-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Sanctuary Metrics
          </CardTitle>
          <CardDescription>Your alignment and consistency</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/20 border border-border/10">
            <Flame className={cn("h-6 w-6 mb-1 text-orange-500", streakData.currentStreak > 0 && "animate-bounce")} />
            <span className="text-2xl font-bold text-foreground font-serif">{streakData.currentStreak}</span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mt-0.5">Streak</span>
          </div>

          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/20 border border-border/10">
            <Book className="h-6 w-6 mb-1 text-primary" />
            <span className="text-2xl font-bold text-foreground font-serif">{streakData.totalEntries}</span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mt-0.5">Logs</span>
          </div>

          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/20 border border-border/10">
            <Scale className="h-6 w-6 mb-1 text-emerald-500" />
            <span className="text-2xl font-bold text-foreground font-serif">{streakData.averageWords}</span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mt-0.5">Avg Words</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Card */}
      <Card className="border border-border bg-card/60 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground/60">Sanctuary Calendar</span>
            <CardTitle className="text-xl font-serif font-semibold text-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAY_NAMES.map((day) => (
              <span key={day} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 font-semibold py-1">
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
              const hasEntry = dateSet.has(dateStr);
              const isToday = dateStr === localToday;
              const yesterdayStr = addDays(localToday, -1);
              const isFuture = dateStr > localToday;
              const isExpired = dateStr < yesterdayStr;
              const isClickable = !isFuture && (!isExpired || hasEntry);

              const dayLabel = isFuture
                ? `Locked date: ${dateStr}`
                : isExpired && !hasEntry
                  ? `Expired date: ${dateStr}`
                  : hasEntry
                    ? `Reflection written on ${dateStr}`
                    : `Write entry for ${dateStr}`;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => isClickable && handleDayClick(day)}
                  disabled={!isClickable}
                  aria-label={dayLabel}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs transition-all duration-200 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    isClickable && "cursor-pointer",
                    isToday && "border border-primary font-bold text-primary",
                    hasEntry
                      ? "bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105"
                      : isClickable
                        ? "text-foreground hover:bg-muted/80 hover:scale-105"
                        : "text-muted-foreground/25 cursor-not-allowed select-none",
                    isToday && !hasEntry && "hover:bg-primary/5"
                  )}
                  title={
                    isFuture
                      ? "Future locked"
                      : isExpired && !hasEntry
                        ? "Grace period expired"
                        : hasEntry
                          ? `Reflection written on ${dateStr}`
                          : `Write entry for ${dateStr}`
                  }
                >
                  <span className="relative z-10" aria-hidden="true">{day}</span>
                  {hasEntry && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
