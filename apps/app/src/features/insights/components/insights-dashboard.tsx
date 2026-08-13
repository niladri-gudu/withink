"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@withink/ui/card";
import { cn } from "@withink/utils";
import { BarChart3, Flame, Loader2, Sparkles, Type } from "lucide-react";

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
    import("./insights-charts").then((m) => ({
      default: m.InsightsChartsSkeleton,
    })),
  { ssr: true },
);

export function InsightsDashboard({
  initialData,
  localToday,
}: InsightsDashboardProps) {
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
    <div className="relative mx-auto max-w-5xl flex-1 space-y-10 p-6 md:p-10">
      {isLoading && (
        <div className="text-muted-foreground/60 absolute top-6 right-10 flex items-center gap-2 font-serif text-xs uppercase">
          <Loader2 className="text-accent h-3 w-3 animate-spin" />
          <span>Adjusting timezone…</span>
        </div>
      )}

      {/* Header */}
      <header className="space-y-2">
        <p className="text-muted-foreground/70 font-hand text-lg">
          a quiet look at your year
        </p>
        <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          Private{" "}
          <span className="text-accent mt-1 block pl-1 text-4xl font-normal italic sm:mt-0 sm:inline sm:text-5xl">
            insights.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          A calm, private analysis of your writing patterns and moods. These
          statistics remain entirely local to your account.
        </p>
      </header>

      {/* Top Cards Grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Current Streak */}
        <Card className="border-border/60 flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-sm">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <Flame
                className={cn(
                  "h-5 w-5",
                  streaks.currentStreak > 0 && "animate-pulse",
                )}
              />
            </div>
            <p className="text-muted-foreground/60 font-serif text-[10px] font-bold tracking-[0.15em] uppercase">
              Current Streak
            </p>
            <p className="text-foreground mt-1 text-3xl font-bold tracking-tighter">
              {streaks.currentStreak}
            </p>
          </div>
          <p className="text-muted-foreground/60 mt-2 text-[10px] uppercase">
            days in a row
          </p>
        </Card>

        {/* Longest Streak */}
        <Card className="border-border/60 flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-sm">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-muted-foreground/60 font-serif text-[10px] font-bold tracking-[0.15em] uppercase">
              Longest Streak
            </p>
            <p className="text-foreground mt-1 text-3xl font-bold tracking-tighter">
              {streaks.longestStreak}
            </p>
          </div>
          <p className="text-muted-foreground/60 mt-2 text-[10px] uppercase">
            consecutive days max
          </p>
        </Card>

        {/* Total Words */}
        <Card className="border-border/60 flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-sm">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <Type className="h-5 w-5" />
            </div>
            <p className="text-muted-foreground/60 font-serif text-[10px] font-bold tracking-[0.15em] uppercase">
              Total Words
            </p>
            <p className="text-foreground mt-1 text-3xl font-bold tracking-tighter">
              {wordCountStats.total.toLocaleString()}
            </p>
          </div>
          <p className="text-muted-foreground/60 mt-2 text-[10px] uppercase">
            written in total
          </p>
        </Card>

        {/* Entries */}
        <Card className="border-border/60 flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-sm">
          <div>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-muted-foreground/60 font-serif text-[10px] font-bold tracking-[0.15em] uppercase">
              Total Entries
            </p>
            <p className="text-foreground mt-1 text-3xl font-bold tracking-tighter">
              {heatmap.filter((d) => d.count > 0).length}
            </p>
          </div>
          <p className="text-muted-foreground/60 mt-2 text-[10px] uppercase">
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
