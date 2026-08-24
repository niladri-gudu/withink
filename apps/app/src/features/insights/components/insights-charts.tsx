"use client";

import { Card } from "@withink/ui/card";

import type { InsightsPayload } from "../services/insights-service";
import { ActivitySummaries } from "./activity-summaries";
import { CalendarHeatmap } from "./calendar-heatmap";
import { MonthlyOverview } from "./monthly-overview";
import { MoodHistoryCharts } from "./mood-history-charts";
import { WordCountCharts } from "./word-count-charts";

/**
 * Bundles the below-fold, SVG-heavy insights visualizations so the dashboard
 * can lazy-load them as one async chunk. The header and stat cards above the
 * fold render immediately; these charts stream in afterward. All data is
 * already fetched by the dashboard (server-rendered with a client timezone
 * correction), so the wrapper is purely presentational — no fetching here.
 */
export function InsightsCharts({
  data,
  localToday,
}: {
  data: InsightsPayload;
  localToday: string;
}) {
  const {
    heatmap,
    moodStats,
    wordCountStats,
    activitySummaries,
    monthlyOverview,
  } = data;

  return (
    <>
      {/* Heatmap Card */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-foreground font-serif text-xl font-semibold tracking-tight">
            Reflection frequency
          </h3>
          <p className="text-body-small text-muted-foreground">
            A month at a time — tap any written day for its story
          </p>
        </div>
        <Card className="border-border/60 p-4 sm:p-6">
          <CalendarHeatmap heatmap={heatmap} localToday={localToday} />
        </Card>
      </section>

      {/* Mood distributions & Trends */}
      <section className="space-y-4">
        <h3 className="text-foreground font-serif text-xl font-semibold tracking-tight">
          Emotional patterns &amp; trends
        </h3>
        <Card className="border-border/60 p-6 md:p-8">
          <MoodHistoryCharts
            distribution={moodStats.distribution}
            average={moodStats.average}
            monthlyAverages={moodStats.monthlyAverages}
          />
        </Card>
      </section>

      {/* Word Count Trends & Habits */}
      <section className="space-y-6">
        <Card className="border-border/60 p-6">
          <WordCountCharts
            total={wordCountStats.total}
            average={wordCountStats.average}
            monthlyTotals={wordCountStats.monthlyTotals}
          />
        </Card>

        <ActivitySummaries
          mostActiveDayOfWeek={activitySummaries.mostActiveDayOfWeek}
          mostActiveTimeOfDay={activitySummaries.mostActiveTimeOfDay}
        />
      </section>

      {/* Monthly details overview */}
      <section className="border-border/10 space-y-4 border-t pt-4">
        <MonthlyOverview monthlyOverview={monthlyOverview} />
      </section>
    </>
  );
}

/**
 * Placeholder shown while the charts chunk streams in. Mirrors the visual
 * footprint of the loaded charts (cards stacked with airy spacing) so the
 * layout doesn't jump when the real content arrives.
 */
export function InsightsChartsSkeleton() {
  return (
    <>
      <section className="space-y-4" aria-hidden>
        <div className="space-y-2">
          <div className="bg-muted/40 h-5 w-56 rounded" />
          <div className="bg-muted/30 h-3 w-72 rounded" />
        </div>
        <Card className="border-border/60 p-6">
          <div className="bg-muted/20 h-32 w-full rounded" />
        </Card>
      </section>

      <section className="space-y-4">
        <div className="bg-muted/40 h-5 w-72 rounded" />
        <Card className="border-border/60 p-6 md:p-8">
          <div className="bg-muted/20 h-40 w-full rounded" />
        </Card>
      </section>

      <section className="space-y-6">
        <Card className="border-border/60 p-6">
          <div className="bg-muted/20 h-40 w-full rounded" />
        </Card>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="border-border/60 p-6">
            <div className="bg-muted/20 h-28 w-full rounded" />
          </Card>
          <Card className="border-border/60 p-6">
            <div className="bg-muted/20 h-28 w-full rounded" />
          </Card>
        </div>
      </section>

      <section className="border-border/10 space-y-4 border-t pt-4">
        <Card className="border-border/60 p-6">
          <div className="bg-muted/20 h-40 w-full rounded" />
        </Card>
      </section>
    </>
  );
}
