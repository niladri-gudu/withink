"use client";

import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface WordCountChartsProps {
  total: number;
  average: number;
  monthlyTotals: { month: string; totalWords: number; averageWords: number; count: number }[];
}

export function WordCountCharts({ total, average, monthlyTotals }: WordCountChartsProps) {
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
    const x = paddingX + (index * (svgWidth - 2 * paddingX - barWidth)) / (totalMonths - 1 || 1);
    
    // Scale bar height
    const barHeight = m.averageWords > 0
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
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h4 className="text-sm font-mono uppercase tracking-wider text-muted-foreground/60">
            Writing Volume
          </h4>
          <p className="text-body-small text-muted-foreground">
            Total of <strong className="text-foreground font-serif text-lg">{total.toLocaleString()}</strong> words written ({average} avg per entry)
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[150px] border border-dashed border-border/40 rounded-xl flex items-center justify-center text-center p-4 bg-muted/5">
          <p className="text-xs text-muted-foreground/60 max-w-[200px]">
            No word count statistics available yet. Write entries to build volume.
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none text-muted-foreground"
          >
            {/* Grid lines */}
            {[0, 0.5, 1].map((ratio) => {
              const value = Math.round(yAxisMax * ratio);
              const y = svgHeight - paddingY - (ratio * (svgHeight - 2 * paddingY));
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
                    className="text-[9px] font-mono font-semibold"
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
                <stop offset="0%" stopColor="rgb(245, 158, 11)" />
                <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Bars */}
            <TooltipProvider>
              {points.map((p) => {
                if (p.count === 0) {
                  return (
                    <g key={p.month}>
                      <text
                        x={p.x + barWidth / 2}
                        y={svgHeight - 4}
                        textAnchor="middle"
                        className="text-[9px] font-mono fill-muted-foreground/40 uppercase"
                      >
                        {formatMonthLabel(p.month)}
                      </text>
                    </g>
                  );
                }

                return (
                  <g key={p.month}>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <rect
                          x={p.x}
                          y={p.y}
                          width={barWidth}
                          height={Math.max(p.barHeight, 2)}
                          rx={3}
                          fill="url(#barGradient)"
                          className="hover:opacity-85 transition-opacity cursor-help"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="font-mono text-[10px]">
                        <strong>{formatMonthLabel(p.month)}</strong>
                        <br />
                        Average: {p.averageWords} words
                        <br />
                        Total: {p.totalWords.toLocaleString()} ({p.count} entries)
                      </TooltipContent>
                    </Tooltip>

                    {/* X-axis labels */}
                    <text
                      x={p.x + barWidth / 2}
                      y={svgHeight - 4}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-muted-foreground/60 uppercase"
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
  );
}
