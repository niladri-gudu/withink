"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Flame, Sparkles, Type, BarChart3, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getInsightsAction } from "../actions/insights-actions";
import type { InsightsPayload } from "../services/insights-service";

interface InsightsDashboardProps {
  initialData: InsightsPayload;
  localToday: string;
}

// The below-fold visualizations (heatmap, mood/word charts, activity summaries,
// monthly overview) are the SVG-heavy part of the page. Load them as one async
// chunk so the header and stat cards above the fold render first.
const InsightsCharts = dynamic(
  () =>
    import("./insights-charts").then((m) => ({ default: m.InsightsCharts })),
  {
    loading: () => <InsightsChartsSkeleton />,
    ssr: true,
  },
);
const InsightsChartsSkeleton = dynamic(
  () =>
    import("./insights-charts").then((m) => ({ default: m.InsightsChartsSkeleton })),
  { ssr: true },
);

export function InsightsDashboard({ initialData, localToday }: InsightsDashboardProps) {
  const [data, setData] = useState<InsightsPayload>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Check client timezone offset and refresh if it differs from UTC (0)
  useEffect(() => {
    const tzOffset = new Date().getTimezoneOffset();
    if (tzOffset !== 0) {
      async function adjustTimezone() {
        setIsLoading(true);
        try {
          const res = await getInsightsAction(localToday, tzOffset);
          if (res.success && res.data) {
            setData(res.data);
          }
        } catch (e) {
          console.error("Failed to fetch timezone-adjusted insights", e);
        } finally {
          setIsLoading(false);
        }
      }
      adjustTimezone();
    }
  }, [localToday]);

  const { streaks, heatmap, wordCountStats } = data;

  return (
    <div className="flex-1 max-w-5xl mx-auto p-6 md:p-10 space-y-10 relative">
      {isLoading && (
        <div className="absolute top-6 right-10 flex items-center gap-2 text-xs font-mono text-muted-foreground/60 uppercase">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>Adjusting timezone…</span>
        </div>
      )}

      {/* Header */}
      <header className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
          System Analysis • Private Stats
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">
          Private{" "}
          <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
            insights.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          A calm, private analysis of your writing patterns and moods. These statistics remain entirely local to your account.
        </p>
      </header>

      {/* Top Cards Grid */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Current Streak */}
        <Card className="border-border/60 p-6 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Flame className={cn("h-5 w-5", streaks.currentStreak > 0 && "animate-pulse")} />
            </div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Current Streak
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tighter text-foreground">
              {streaks.currentStreak}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">
            days in a row
          </p>
        </Card>

        {/* Longest Streak */}
        <Card className="border-border/60 p-6 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Longest Streak
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tighter text-foreground">
              {streaks.longestStreak}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">
            consecutive days max
          </p>
        </Card>

        {/* Total Words */}
        <Card className="border-border/60 p-6 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Type className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Total Words
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tighter text-foreground">
              {wordCountStats.total.toLocaleString()}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">
            written in total
          </p>
        </Card>

        {/* Entries */}
        <Card className="border-border/60 p-6 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Total Entries
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tighter text-foreground">
              {heatmap.filter((d) => d.count > 0).length}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">
            saved reflections
          </p>
        </Card>
      </section>

      {/* Below-fold visualizations: heatmap, mood/word charts, activity, monthly.
          Lazy-loaded as one async chunk so the header + stat cards render first. */}
      <InsightsCharts data={data} />
    </div>
  );
}
