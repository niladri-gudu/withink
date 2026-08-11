"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@withink/ui/tooltip";
import { cn } from "@withink/utils";
import { Angry, Frown, Meh, Smile, SmilePlus } from "lucide-react";

interface MoodHistoryChartsProps {
  distribution: Record<number, number>;
  average: number | null;
  monthlyAverages: {
    month: string;
    averageMood: number | null;
    count: number;
  }[];
}

const moodConfig: Record<
  number,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    barColor: string;
  }
> = {
  1: {
    label: "Angry",
    icon: Angry,
    color: "text-mood-1",
    barColor: "bg-mood-1",
  },
  2: { label: "Sad", icon: Frown, color: "text-mood-2", barColor: "bg-mood-2" },
  3: {
    label: "Neutral",
    icon: Meh,
    color: "text-mood-3",
    barColor: "bg-mood-3",
  },
  4: {
    label: "Happy",
    icon: Smile,
    color: "text-mood-4",
    barColor: "bg-mood-4",
  },
  5: {
    label: "Radiant",
    icon: SmilePlus,
    color: "text-mood-5",
    barColor: "bg-mood-5",
  },
};

export function MoodHistoryCharts({
  distribution,
  average,
  monthlyAverages,
}: MoodHistoryChartsProps) {
  // 1. Calculate percentage for distribution progress bars
  const totalMoodsLogged = Object.values(distribution).reduce(
    (sum, val) => sum + val,
    0,
  );

  const getPercentage = (count: number) => {
    if (totalMoodsLogged === 0) return 0;
    return Math.round((count / totalMoodsLogged) * 100);
  };

  // 2. Prepare trend chart dimensions
  const svgWidth = 500;
  const svgHeight = 150;
  const paddingX = 40;
  const paddingY = 20;

  // Filter months to only include ones that have entries/stats (or fill with default 3.0/null)
  const points = monthlyAverages.map((m, index) => {
    const x =
      paddingX +
      (index * (svgWidth - 2 * paddingX)) / (monthlyAverages.length - 1);
    // Mood scales 1 (bottom) to 5 (top)
    const moodVal = m.averageMood ?? 3.0; // fallback to neutral if null
    const y =
      svgHeight - paddingY - ((moodVal - 1) * (svgHeight - 2 * paddingY)) / 4;
    return {
      ...m,
      x,
      y,
      hasData: m.averageMood !== null,
    };
  });

  // Generate SVG path line
  let linePath = "";
  let areaPath = "";

  const activePoints = points.filter((p) => p.hasData);

  if (activePoints.length > 1) {
    linePath =
      `M ${activePoints[0]!.x} ${activePoints[0]!.y} ` +
      activePoints
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ");

    // For area under the curve, drop down to the bottom boundary of the chart
    const bottomY = svgHeight - paddingY;
    areaPath = `${linePath} L ${activePoints[activePoints.length - 1]!.x} ${bottomY} L ${activePoints[0]!.x} ${bottomY} Z`;
  }

  // Format month label from YYYY-MM to MMM YY
  const formatMonthLabel = (monthStr: string) => {
    const [y, m] = monthStr.split("-").map(Number);
    const date = new Date(y!, m! - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Mood Distribution */}
      <div className="space-y-6">
        <div>
          <h4 className="text-muted-foreground/60 mb-2 font-mono text-sm tracking-wider uppercase">
            Mood Distribution
          </h4>
          {average !== null ? (
            <p className="text-body-small text-muted-foreground">
              Your average mood is{" "}
              <strong className="text-foreground font-serif text-lg">
                {average}
              </strong>{" "}
              ({totalMoodsLogged} reflections logged)
            </p>
          ) : (
            <p className="text-body-small text-muted-foreground">
              Select moods while writing to observe patterns.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {[5, 4, 3, 2, 1].map((rating) => {
            const config = moodConfig[rating]!;
            const Icon = config.icon;
            const count = distribution[rating] || 0;
            const pct = getPercentage(count);

            return (
              <div key={rating} className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex w-24 shrink-0 items-center gap-1.5 text-xs font-medium",
                    config.color,
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{config.label}</span>
                </div>

                {/* Progress bar track */}
                <div className="bg-muted/20 dark:bg-muted/10 border-border/5 relative h-2 flex-grow overflow-hidden rounded-full border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      config.barColor,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="text-muted-foreground w-12 text-right font-mono text-[10px]">
                  {pct}% ({count})
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood Trend (6 Months) */}
      <div className="space-y-4">
        <div>
          <h4 className="text-muted-foreground/60 mb-2 font-mono text-sm tracking-wider uppercase">
            6-Month Mood Trend
          </h4>
          <p className="text-body-small text-muted-foreground">
            Observe shifts in your long-term emotional baseline
          </p>
        </div>

        {activePoints.length === 0 ? (
          <div className="border-border/40 bg-muted/5 flex h-[150px] items-center justify-center rounded-xl border border-dashed p-4 text-center">
            <p className="text-muted-foreground/60 max-w-[200px] text-xs">
              Not enough mood data to plot a trend. Keep writing daily logs!
            </p>
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="text-muted-foreground h-auto w-full overflow-visible select-none"
            >
              {/* Horizontal grid lines for mood levels 1 to 5 */}
              {[1, 2, 3, 4, 5].map((level) => {
                const y =
                  svgHeight -
                  paddingY -
                  ((level - 1) * (svgHeight - 2 * paddingY)) / 4;
                return (
                  <g key={level} className="opacity-15 dark:opacity-10">
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 3}
                      textAnchor="end"
                      className="font-mono text-[9px] font-semibold"
                      fill="currentColor"
                    >
                      {level}
                    </text>
                  </g>
                );
              })}

              {/* Area filling under line */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#moodGradient)"
                  className="opacity-15 dark:opacity-10"
                />
              )}

              {/* Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-primary, currentColor)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500 dark:text-emerald-400"
                />
              )}

              {/* Gradients definitions */}
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="rgb(16, 185, 129)"
                    stopOpacity="0.4"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgb(16, 185, 129)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Interactive nodes */}
              <TooltipProvider>
                {points.map((p) => {
                  if (!p.hasData) return null;

                  return (
                    <g key={p.month}>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={4}
                            className="fill-background hover:r-6 cursor-help stroke-emerald-500 stroke-[2px] transition-all duration-200 dark:stroke-emerald-400"
                          />
                        </TooltipTrigger>
                        <TooltipContent className="font-mono text-[10px]">
                          <strong>{formatMonthLabel(p.month)}</strong>
                          <br />
                          Average: {p.averageMood} ({p.count} entries)
                        </TooltipContent>
                      </Tooltip>

                      {/* X-axis Month Label */}
                      <text
                        x={p.x}
                        y={svgHeight - 4}
                        textAnchor="middle"
                        className="fill-muted-foreground/60 font-mono text-[9px] uppercase"
                      >
                        {formatMonthLabel(p.month)}
                      </text>
                    </g>
                  );
                })}
              </TooltipProvider>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
