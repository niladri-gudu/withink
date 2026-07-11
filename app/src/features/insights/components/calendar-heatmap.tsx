"use client";

import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string;
  count: number;
  wordCount: number;
  mood: number | null;
}

interface CalendarHeatmapProps {
  heatmap: HeatmapDay[];
}

const moodLabels: Record<number, string> = {
  1: "Angry",
  2: "Sad",
  3: "Neutral",
  4: "Happy",
  5: "Radiant",
};

export function CalendarHeatmap({ heatmap }: CalendarHeatmapProps) {
  if (!heatmap || heatmap.length === 0) return null;

  // 1. Determine day of the week of the first entry to align columns properly
  const firstDateStr = heatmap[0]!.date;
  const [year, month, day] = firstDateStr.split("-").map(Number);
  const firstDateObj = new Date(year!, month! - 1, day!);
  const firstDayOfWeek = firstDateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // 2. Prepend spacers for alignment
  const gridItems: (HeatmapDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...heatmap,
  ];

  // Helper to format date for tooltips
  const formatDateLabel = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper to get color intensity based on word count
  const getIntensityClass = (dayData: HeatmapDay) => {
    if (dayData.count === 0) {
      return "bg-muted/15 dark:bg-muted/10 border-transparent hover:bg-muted/25 dark:hover:bg-muted/20";
    }

    const wc = dayData.wordCount;
    if (wc < 100) {
      return "bg-emerald-500/20 border-emerald-500/10 dark:bg-emerald-500/15 dark:border-emerald-500/5 hover:bg-emerald-500/35";
    }
    if (wc < 300) {
      return "bg-emerald-500/40 border-emerald-500/20 dark:bg-emerald-500/30 dark:border-emerald-500/10 hover:bg-emerald-500/55";
    }
    if (wc < 600) {
      return "bg-emerald-500/70 border-emerald-500/35 dark:bg-emerald-500/55 dark:border-emerald-500/20 hover:bg-emerald-500/85";
    }
    return "bg-emerald-500 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500 hover:scale-105";
  };

  // 3. Extract monthly labels to show above the grid
  // We want to identify the index of the first Sunday of each month to place the month name.
  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;

  gridItems.forEach((item, index) => {
    if (!item) return;
    const [_, m, d] = item.date.split("-").map(Number);
    
    // If it's a Sunday (row index 0 in that column, which corresponds to index % 7 === 0)
    // and it is a new month, place a label.
    if (index % 7 === 0 && m !== lastMonth) {
      const dateObj = new Date(year!, m! - 1, d!);
      const monthName = dateObj.toLocaleDateString("en-US", { month: "short" });
      monthLabels.push({
        label: monthName,
        colIndex: Math.floor(index / 7),
      });
      lastMonth = m!;
    }
  });

  return (
    <div className="flex flex-col w-full overflow-x-auto no-scrollbar py-2">
      <div className="min-w-[760px] select-none">
        {/* Months header */}
        <div className="relative h-6 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-1">
          {monthLabels.map((lbl, idx) => (
            <span
              key={`${lbl.label}-${idx}`}
              className="absolute"
              style={{ left: `${lbl.colIndex * 14 + 32}px` }}
            >
              {lbl.label}
            </span>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="flex gap-2 items-start">
          {/* Days of week labels */}
          <div className="grid grid-rows-7 gap-[3px] text-[9px] font-mono uppercase text-muted-foreground/40 w-6 pt-1">
            <span>Sun</span>
            <span></span>
            <span>Tue</span>
            <span></span>
            <span>Thu</span>
            <span></span>
            <span>Sat</span>
          </div>

          <TooltipProvider>
            <div className="grid grid-flow-col grid-rows-7 gap-[3px] flex-grow">
              {gridItems.map((item, index) => {
                if (!item) {
                  return (
                    <div
                      key={`spacer-${index}`}
                      className="w-[11px] h-[11px] bg-transparent"
                    />
                  );
                }

                const intensity = getIntensityClass(item);
                const hasEntry = item.count > 0;
                const moodLabel = item.mood ? ` • Mood: ${moodLabels[item.mood]}` : "";

                return (
                  <Tooltip key={item.date} delayDuration={150}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-[11px] h-[11px] rounded-[2.5px] border cursor-help transition-all duration-300",
                          intensity
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-mono text-[10px]">
                      {hasEntry ? (
                        <span>
                          <strong className="text-foreground">{formatDateLabel(item.date)}</strong>
                          <br />
                          {item.wordCount} words{moodLabel}
                        </span>
                      ) : (
                        <span>
                          <strong className="text-muted-foreground">{formatDateLabel(item.date)}</strong>
                          <br />
                          No reflection
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-[10px] font-mono text-muted-foreground/60 uppercase">
          <span>Less</span>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-muted/15 border border-transparent" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500/20 border border-emerald-500/10 dark:bg-emerald-500/15" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500/40 border border-emerald-500/20 dark:bg-emerald-500/30" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500/70 border border-emerald-500/35 dark:bg-emerald-500/55" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500 border border-emerald-600 dark:bg-emerald-600" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
