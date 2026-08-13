"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@withink/ui/card";
import { cn } from "@withink/utils";
import {
  Angry,
  Calendar,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Sparkles,
  Type,
} from "lucide-react";

interface MonthlyStat {
  month: string;
  totalWords: number;
  averageWords: number;
  averageMood: number | null;
  entryCount: number;
  moodDistribution: Record<number, number>;
}

interface MonthlyOverviewProps {
  monthlyOverview: Record<string, MonthlyStat>;
}

const moodConfig: Record<
  number,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    barColor: string;
  }
> = {
  1: {
    label: "Angry",
    icon: Angry,
    color: "text-mood-1",
    bgColor: "bg-mood-1-bg border-mood-1-border",
    barColor: "bg-mood-1",
  },
  2: {
    label: "Sad",
    icon: Frown,
    color: "text-mood-2",
    bgColor: "bg-mood-2-bg border-mood-2-border",
    barColor: "bg-mood-2",
  },
  3: {
    label: "Neutral",
    icon: Meh,
    color: "text-mood-3",
    bgColor: "bg-mood-3-bg border-mood-3-border",
    barColor: "bg-mood-3",
  },
  4: {
    label: "Happy",
    icon: Smile,
    color: "text-mood-4",
    bgColor: "bg-mood-4-bg border-mood-4-border",
    barColor: "bg-mood-4",
  },
  5: {
    label: "Radiant",
    icon: SmilePlus,
    color: "text-mood-5",
    bgColor: "bg-mood-5-bg border-mood-5-border",
    barColor: "bg-mood-5",
  },
};

export function MonthlyOverview({ monthlyOverview }: MonthlyOverviewProps) {
  // Sort months in descending order (latest first)
  const months = Object.keys(monthlyOverview).sort().reverse();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const sorted = Object.keys(monthlyOverview).sort().reverse();
    return sorted[0] || "";
  });

  if (months.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex items-center justify-center p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No monthly statistics available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stat = monthlyOverview[selectedMonth];
  if (!stat) return null;

  const formatMonthTitle = (monthStr: string) => {
    const [y, m] = monthStr.split("-").map(Number);
    const date = new Date(y!, m! - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const totalMoodsInMonth = Object.values(stat.moodDistribution).reduce(
    (sum, val) => sum + val,
    0,
  );

  const getPercentage = (count: number) => {
    if (totalMoodsInMonth === 0) return 0;
    return Math.round((count / totalMoodsInMonth) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-muted-foreground/60 mb-1 font-serif text-sm tracking-[0.15em] uppercase">
            Monthly Review
          </h4>
          <p className="text-body-small text-muted-foreground">
            Filter statistics by month to inspect localized habits
          </p>
        </div>

        {/* Dropdown Selector */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-card border-border text-foreground focus-visible:ring-ring h-10 cursor-pointer rounded-xl border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-[200px]"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthTitle(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of monthly metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Entries written */}
        <Card className="border-border/60 flex items-center gap-4 p-5">
          <div className="bg-accent/10 border-accent/20 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground/60 font-serif text-[10px] tracking-[0.15em] uppercase">
              Reflections
            </p>
            <p className="text-foreground font-serif text-2xl font-bold">
              {stat.entryCount}
            </p>
            <p className="text-muted-foreground mt-0.5 font-serif text-[10px]">
              days written
            </p>
          </div>
        </Card>

        {/* Words written */}
        <Card className="border-border/60 flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
            <Type className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground/60 font-serif text-[10px] tracking-[0.15em] uppercase">
              Words
            </p>
            <p className="text-foreground font-serif text-2xl font-bold">
              {stat.totalWords.toLocaleString()}
            </p>
            <p className="text-muted-foreground mt-0.5 font-serif text-[10px]">
              {stat.averageWords} avg / entry
            </p>
          </div>
        </Card>

        {/* Average mood */}
        <Card className="border-border/60 flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground/60 font-serif text-[10px] tracking-[0.15em] uppercase">
              Average Mood
            </p>
            <p className="text-foreground font-serif text-2xl font-bold">
              {stat.averageMood !== null ? stat.averageMood : "—"}
            </p>
            <p className="text-muted-foreground mt-0.5 font-serif text-[10px]">
              {totalMoodsInMonth} moods logged
            </p>
          </div>
        </Card>
      </div>

      {/* Monthly Mood Distribution */}
      {totalMoodsInMonth > 0 && (
        <Card className="border-border/60 p-6">
          <h5 className="text-muted-foreground/60 mb-4 font-serif text-[10px] tracking-[0.15em] uppercase">
            Mood Distribution in {formatMonthTitle(selectedMonth)}
          </h5>
          <div className="grid gap-3 sm:grid-cols-5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const config = moodConfig[rating]!;
              const Icon = config.icon;
              const count = stat.moodDistribution[rating] || 0;
              const pct = getPercentage(count);

              return (
                <div
                  key={rating}
                  className="border-border/40 bg-card hover:bg-muted/5 flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-colors"
                >
                  <div
                    className={cn(
                      "mb-2 flex h-8 w-8 items-center justify-center rounded-full border",
                      config.bgColor,
                      config.color,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-muted-foreground/60 font-serif text-[10px] tracking-[0.12em] uppercase">
                    {config.label}
                  </span>
                  <span className="text-foreground mt-1 font-serif text-base font-bold">
                    {pct}%
                  </span>
                  <span className="text-muted-foreground/40 mt-0.5 font-serif text-[9px] uppercase">
                    {count} days
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
