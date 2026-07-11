"use client";

import React, { useState } from "react";
import { Calendar, Type, Sparkles, Angry, Frown, Meh, Smile, SmilePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  1: { label: "Angry", icon: Angry, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/20", barColor: "bg-red-500" },
  2: { label: "Sad", icon: Frown, color: "text-orange-500", bgColor: "bg-orange-500/10 border-orange-500/20", barColor: "bg-orange-500" },
  3: { label: "Neutral", icon: Meh, color: "text-yellow-500", bgColor: "bg-yellow-500/10 border-yellow-500/20", barColor: "bg-yellow-500" },
  4: { label: "Happy", icon: Smile, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20", barColor: "bg-emerald-500" },
  5: { label: "Radiant", icon: SmilePlus, color: "text-teal-500", bgColor: "bg-teal-500/10 border-teal-500/20", barColor: "bg-teal-500" },
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
          <p className="text-sm text-muted-foreground">No monthly statistics available.</p>
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

  const totalMoodsInMonth = Object.values(stat.moodDistribution).reduce((sum, val) => sum + val, 0);

  const getPercentage = (count: number) => {
    if (totalMoodsInMonth === 0) return 0;
    return Math.round((count / totalMoodsInMonth) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-sm font-mono uppercase tracking-wider text-muted-foreground/60 mb-1">
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
          className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none cursor-pointer focus:border-primary/50 transition-colors sm:w-[200px]"
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
        <Card className="border-border/60 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
              Reflections
            </p>
            <p className="text-2xl font-serif font-bold text-foreground">
              {stat.entryCount}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              days written
            </p>
          </div>
        </Card>

        {/* Words written */}
        <Card className="border-border/60 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Type className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
              Words
            </p>
            <p className="text-2xl font-serif font-bold text-foreground">
              {stat.totalWords.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {stat.averageWords} avg / entry
            </p>
          </div>
        </Card>

        {/* Average mood */}
        <Card className="border-border/60 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
              Average Mood
            </p>
            <p className="text-2xl font-serif font-bold text-foreground">
              {stat.averageMood !== null ? stat.averageMood : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {totalMoodsInMonth} moods logged
            </p>
          </div>
        </Card>
      </div>

      {/* Monthly Mood Distribution */}
      {totalMoodsInMonth > 0 && (
        <Card className="border-border/60 p-6">
          <h5 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-4">
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
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/5 transition-colors text-center"
                >
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border mb-2", config.bgColor, config.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                    {config.label}
                  </span>
                  <span className="text-base font-serif font-bold text-foreground mt-1">
                    {pct}%
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase mt-0.5">
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
