"use client";

import { Card } from "@/components/ui/card";
import type { InsightsPayload } from "../services/insights-service";
import { CalendarHeatmap } from "./calendar-heatmap";
import { MoodHistoryCharts } from "./mood-history-charts";
import { WordCountCharts } from "./word-count-charts";
import { ActivitySummaries } from "./activity-summaries";
import { MonthlyOverview } from "./monthly-overview";

/**
 * Bundles the below-fold, SVG-heavy insights visualizations so the dashboard
 * can lazy-load them as one async chunk. The header and stat cards above the
 * fold render immediately; these charts stream in afterward. All data is
 * already fetched by the dashboard (server-rendered with a client timezone
 * correction), so the wrapper is purely presentational — no fetching here.
 */
export function InsightsCharts({ data }: { data: InsightsPayload }) {
  const { heatmap, moodStats, wordCountStats, activitySummaries, monthlyOverview } = data;

  return (
    <>
      {/* Heatmap Card */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-serif font-semibold tracking-tight text-foreground uppercase">
            Reflection Frequency
          </h3>
          <p className="text-body-small text-muted-foreground">
            A visual summary of your consistency over the past 365 days
          </p>
        </div>
        <Card className="border-border/60 p-6">
          <CalendarHeatmap heatmap={heatmap} />
        </Card>
      </section>

      {/* Mood distributions & Trends */}
      <section className="space-y-4">
        <h3 className="text-lg font-serif font-semibold tracking-tight text-foreground uppercase">
          Emotional Patterns & Trends
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
      <section className="space-y-4 pt-4 border-t border-border/10">
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
          <div className="h-5 w-56 rounded bg-muted/40" />
          <div className="h-3 w-72 rounded bg-muted/30" />
        </div>
        <Card className="border-border/60 p-6">
          <div className="h-32 w-full rounded bg-muted/20" />
        </Card>
      </section>

      <section className="space-y-4">
        <div className="h-5 w-72 rounded bg-muted/40" />
        <Card className="border-border/60 p-6 md:p-8">
          <div className="h-40 w-full rounded bg-muted/20" />
        </Card>
      </section>

      <section className="space-y-6">
        <Card className="border-border/60 p-6">
          <div className="h-40 w-full rounded bg-muted/20" />
        </Card>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="border-border/60 p-6">
            <div className="h-28 w-full rounded bg-muted/20" />
          </Card>
          <Card className="border-border/60 p-6">
            <div className="h-28 w-full rounded bg-muted/20" />
          </Card>
        </div>
      </section>

      <section className="space-y-4 pt-4 border-t border-border/10">
        <Card className="border-border/60 p-6">
          <div className="h-40 w-full rounded bg-muted/20" />
        </Card>
      </section>
    </>
  );
}
