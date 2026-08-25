"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@withink/ui/popover";

interface WordCountChartsProps {
  total: number;
  average: number;
  monthlyTotals: {
    month: string;
    totalWords: number;
    averageWords: number;
    count: number;
  }[];
}

export function WordCountCharts({
  total,
  average,
  monthlyTotals,
}: WordCountChartsProps) {
  // 1. Prepare dimensions for SVG bar chart
  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 45;
  const paddingY = 20;

  // Find max average words to scale y-axis
  const maxAverage = Math.max(...monthlyTotals.map((m) => m.averageWords), 100);
  // Round up to nearest 100 for grid lines
  const yAxisMax = Math.ceil(maxAverage / 100) * 100;

  const barWidth = 24;
  const totalMonths = monthlyTotals.length;

  const points = monthlyTotals.map((m, index) => {
    // Distribute bars evenly
    const x =
      paddingX +
      (index * (svgWidth - 2 * paddingX - barWidth)) / (totalMonths - 1 || 1);

    // Scale bar height
    const barHeight =
      m.averageWords > 0
        ? (m.averageWords * (svgHeight - 2 * paddingY)) / yAxisMax
        : 0;

    const y = svgHeight - paddingY - barHeight;

    return {
      ...m,
      x,
      y,
      barHeight,
    };
  });

  const formatMonthLabel = (monthStr: string) => {
    const [y, m] = monthStr.split("-").map(Number);
    const date = new Date(y!, m! - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  const hasData = monthlyTotals.some((m) => m.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h4 className="text-foreground font-serif text-lg font-semibold tracking-tight">
            Writing volume
          </h4>
          <p className="text-body-small text-muted-foreground">
            Total of{" "}
            <strong className="text-foreground font-serif text-lg">
              {total.toLocaleString()}
            </strong>{" "}
            words written ({average} avg per entry)
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="border-border/40 bg-muted/5 flex h-[150px] items-center justify-center rounded-xl border border-dashed p-4 text-center">
          <p className="text-muted-foreground/60 max-w-[200px] text-xs">
            No word count statistics available yet. Write entries to build
            volume.
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="text-muted-foreground h-auto w-full overflow-visible select-none"
          >
            {/* Grid lines */}
            {[0, 0.5, 1].map((ratio) => {
              const value = Math.round(yAxisMax * ratio);
              const y =
                svgHeight - paddingY - ratio * (svgHeight - 2 * paddingY);
              return (
                <g key={ratio} className="opacity-15 dark:opacity-10">
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth={1}
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 3}
                    textAnchor="end"
                    className="font-serif text-[9px] font-semibold"
                    fill="currentColor"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {/* Definitions for Gradients */}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent, #c39553)" />
                <stop
                  offset="100%"
                  stopColor="var(--color-accent, #c39553)"
                  stopOpacity="0.25"
                />
              </linearGradient>
            </defs>

            {/* Bars — full-column transparent hit areas so touch can open
                the month details (no dead hover-only tooltip) */}
            {points.map((p) => {
              if (p.count === 0) {
                return (
                  <g key={p.month}>
                    <text
                      x={p.x + barWidth / 2}
                      y={svgHeight - 4}
                      textAnchor="middle"
                      className="fill-muted-foreground/40 font-serif text-[9px] uppercase"
                    >
                      {formatMonthLabel(p.month)}
                    </text>
                  </g>
                );
              }

              return (
                <g key={p.month}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <g
                        role="button"
                        tabIndex={0}
                        aria-label={`${formatMonthLabel(p.month)}: ${p.totalWords.toLocaleString()} total words, ${p.averageWords} average, across ${p.count} entries`}
                        className="cursor-pointer focus:outline-none"
                      >
                        {/* Expanded invisible hit area for the whole column */}
                        <rect
                          x={p.x - 6}
                          y={paddingY}
                          width={barWidth + 12}
                          height={svgHeight - 2 * paddingY}
                          className="fill-transparent stroke-none"
                        />
                        <rect
                          x={p.x}
                          y={p.y}
                          width={barWidth}
                          height={Math.max(p.barHeight, 2)}
                          rx={3}
                          fill="url(#barGradient)"
                          className="transition-opacity hover:opacity-85"
                        />
                      </g>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-44">
                      <p className="text-foreground font-serif text-xs font-semibold">
                        {formatMonthLabel(p.month)}
                      </p>
                      <p className="text-muted-foreground font-serif text-[11px]">
                        Average: {p.averageWords} words
                        <br />
                        Total: {p.totalWords.toLocaleString()} ({p.count}{" "}
                        entries)
                      </p>
                    </PopoverContent>
                  </Popover>

                  {/* X-axis labels */}
                  <text
                    x={p.x + barWidth / 2}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    className="fill-muted-foreground/60 font-serif text-[9px] uppercase"
                  >
                    {formatMonthLabel(p.month)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
