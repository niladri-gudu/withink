"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@withink/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/features/app-shell/components/page-header";

import { getInsightsAction } from "../actions/insights-actions";
import type { InsightsPayload } from "../services/insights-service";

interface InsightsDashboardProps {
  initialData: InsightsPayload;
  localToday: string;
  /** Timezone offset used for the server-rendered (cached) computation. */
  ssrTzOffset?: number;
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
  ssrTzOffset = 0,
}: InsightsDashboardProps) {
  const [data, setData] = useState<InsightsPayload>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh only when the client timezone differs from the one used at SSR
  // (e.g. first visit before the tz cookie is set, or a tz change mid-session).
  useEffect(() => {
    const tzOffset = new Date().getTimezoneOffset();
    if (tzOffset !== ssrTzOffset) {
      async function adjustTimezone() {
        setIsLoading(true);
        try {
          const res = await getInsightsAction(localToday, tzOffset);
          if (res.success && res.data) {
            setData(res.data);
          }
        } catch (e) {
          console.error("Failed to fetch timezone-adjusted insights", e);
          toast.error("Couldn't adjust insights for your timezone", {
            description: "Showing the times as they were written.",
          });
        } finally {
          setIsLoading(false);
        }
      }
      adjustTimezone();
    }
  }, [localToday, ssrTzOffset]);

  const { streaks, heatmap, wordCountStats } = data;

  return (
    <div className="relative w-full space-y-10">
      {isLoading && (
        <div className="text-muted-foreground/60 absolute top-6 right-10 flex items-center gap-2 font-serif text-xs uppercase">
          <Loader2 className="text-accent h-3 w-3 animate-spin" />
          <span>Adjusting timezone…</span>
        </div>
      )}

      <PageHeader
        runningHead="Insights"
        note="a quiet look at your year"
        title="Private"
        accent="insights."
        description="A calm, private analysis of your writing patterns and moods. These statistics remain entirely local to your account."
        today={localToday}
      />

      {/* At a glance — one ruled passage, four entries */}
      <Card className="border-border overflow-hidden rounded-xl border">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <div className="border-border/70 p-4 sm:p-6">
            <p className="text-running-head text-muted-foreground/70">
              Current streak
            </p>
            <p className="text-foreground mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {streaks.currentStreak}
            </p>
            <p className="text-muted-foreground/60 font-hand mt-1 text-base">
              days in a row
            </p>
          </div>
          <div className="border-border/70 border-t border-l p-4 sm:p-6 md:border-t-0">
            <p className="text-running-head text-muted-foreground/70">
              Longest streak
            </p>
            <p className="text-foreground mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {streaks.longestStreak}
            </p>
            <p className="text-muted-foreground/60 font-hand mt-1 text-base">
              consecutive days max
            </p>
          </div>
          <div className="border-border/70 border-t p-4 sm:p-6 md:border-l">
            <p className="text-running-head text-muted-foreground/70">
              Total words
            </p>
            <p className="text-foreground mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {wordCountStats.total.toLocaleString()}
            </p>
            <p className="text-muted-foreground/60 font-hand mt-1 text-base">
              written in total
            </p>
          </div>
          <div className="border-border/70 border-t border-l p-4 sm:p-6">
            <p className="text-running-head text-muted-foreground/70">
              Entries
            </p>
            <p className="text-foreground mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {heatmap.filter((d) => d.count > 0).length}
            </p>
            <p className="text-muted-foreground/60 font-hand mt-1 text-base">
              saved reflections
            </p>
          </div>
        </div>
      </Card>

      {/* Below-fold visualizations: heatmap, mood/word charts, activity, monthly.
          Lazy-loaded as one async chunk so the header + stat cards render first. */}
      <InsightsCharts data={data} localToday={localToday} />
    </div>
  );
}
