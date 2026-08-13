"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@withink/ui/card";
import { Loader2 } from "lucide-react";

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
    <div className="relative w-full space-y-10">
      {isLoading && (
        <div className="text-muted-foreground/60 absolute top-6 right-10 flex items-center gap-2 font-serif text-xs uppercase">
          <Loader2 className="text-accent h-3 w-3 animate-spin" />
          <span>Adjusting timezone…</span>
        </div>
      )}

      {/* Running head + page title */}
      <header>
        <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
          <span className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
            Insights
          </span>
          <span className="text-muted-foreground/50 font-hand text-base leading-none">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
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
        </div>
      </header>

      {/* At a glance — one ruled passage, four entries */}
      <Card className="border-border overflow-hidden rounded-xl border">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <div className="border-border/70 p-6">
            <p className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
              Current streak
            </p>
            <p className="text-foreground mt-2 font-serif text-4xl font-bold tracking-tight">
              {streaks.currentStreak}
            </p>
            <p className="text-muted-foreground/60 mt-1 font-hand text-base">
              days in a row
            </p>
          </div>
          <div className="border-border/70 border-t p-6 md:border-t-0 md:border-l">
            <p className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
              Longest streak
            </p>
            <p className="text-foreground mt-2 font-serif text-4xl font-bold tracking-tight">
              {streaks.longestStreak}
            </p>
            <p className="text-muted-foreground/60 mt-1 font-hand text-base">
              consecutive days max
            </p>
          </div>
          <div className="border-border/70 border-t p-6 md:border-l md:border-t-0">
            <p className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
              Total words
            </p>
            <p className="text-foreground mt-2 font-serif text-4xl font-bold tracking-tight">
              {wordCountStats.total.toLocaleString()}
            </p>
            <p className="text-muted-foreground/60 mt-1 font-hand text-base">
              written in total
            </p>
          </div>
          <div className="border-border/70 border-t p-6 md:border-l md:border-t-0">
            <p className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
              Entries
            </p>
            <p className="text-foreground mt-2 font-serif text-4xl font-bold tracking-tight">
              {heatmap.filter((d) => d.count > 0).length}
            </p>
            <p className="text-muted-foreground/60 mt-1 font-hand text-base">
              saved reflections
            </p>
          </div>
        </div>
      </Card>

      {/* Below-fold visualizations: heatmap, mood/word charts, activity, monthly.
          Lazy-loaded as one async chunk so the header + stat cards render first. */}
      <InsightsCharts data={data} />
    </div>
  );
}
