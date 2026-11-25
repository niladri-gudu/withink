"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Card } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/features/app-shell/components/page-header";
import { useLocalJournal } from "@/features/journal/hooks/use-local-journal";

import { getInsightsAction } from "../actions/insights-actions";
import {
  computeInsights,
  type InsightsPayload,
} from "../services/insights-compute";

interface InsightsDashboardProps {
  /** Server-aggregated payload; `null` for zero-knowledge local mode. */
  initialData: InsightsPayload | null;
  localToday: string;
  /** Timezone offset used for the server-rendered (cached) computation. */
  ssrTzOffset?: number;
  /**
   * Zero-knowledge accounts compute the identical payload from their
   * decrypted local timeline and never wait on the server.
   */
  localMode?: boolean;
}

const subscribeToNothing = () => () => {};

function getClientTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
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
  localMode = false,
}: InsightsDashboardProps) {
  const [data, setData] = useState<InsightsPayload | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Use the cookie offset for SSR, then the device offset on the client without
  // a setState-in-effect cascade. The local aggregation only renders once the
  // key is in memory, so this never causes a hydration mismatch.
  const tzOffset = useSyncExternalStore(
    subscribeToNothing,
    getClientTimezoneOffset,
    () => ssrTzOffset,
  );

  // Legacy (server) accounts: refresh only when the client timezone differs
  // from the one used at SSR (first visit before the tz cookie is set, or a
  // tz change mid-session). Local accounts recompute synchronously instead.
  useEffect(() => {
    if (localMode) return;
    const clientTz = new Date().getTimezoneOffset();
    if (clientTz !== ssrTzOffset) {
      async function adjustTimezone() {
        setIsLoading(true);
        try {
          const res = await getInsightsAction(localToday, clientTz);
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
  }, [localMode, localToday, ssrTzOffset]);

  // Local-first path: the same pure aggregation over the decrypted timeline.
  const local = useLocalJournal(localToday);
  const localData = useMemo(() => {
    if (!localMode) return null;
    return computeInsights(
      local.timeline.map((entry) => ({
        date: entry.date,
        wordCount: entry.wordCount,
        mood: entry.mood,
        createdAt: entry.createdAt,
      })),
      localToday,
      tzOffset,
    );
  }, [localMode, local.timeline, localToday, tzOffset]);

  // A ZK account's local data is readable only once the key is in memory; the
  // page sits behind the lock overlay before that, so show a skeleton rather
  // than a truthful-but-empty set of zeroed stats.
  const localWaiting =
    localMode &&
    (!local.isLocal ||
      local.isLoading ||
      (local.isWarming && local.timeline.length === 0));

  const activeData = localMode ? localData : data;

  if (!activeData || localWaiting) {
    return <InsightsLoading localToday={localToday} localMode={localMode} />;
  }

  const { streaks, heatmap, wordCountStats } = activeData;

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
      <InsightsCharts data={activeData} localToday={localToday} />
    </div>
  );
}

/** Header + stat/heatmap placeholders while server or local data resolves. */
function InsightsLoading({
  localToday,
  localMode,
}: {
  localToday: string;
  localMode: boolean;
}) {
  return (
    <div className="animate-in fade-in w-full space-y-10 duration-300">
      <PageHeader
        runningHead="Insights"
        note="a quiet look at your year"
        title="Private"
        accent="insights."
        description="A calm, private analysis of your writing patterns and moods. These statistics remain entirely local to your account."
        today={localToday}
      />

      <div className="text-muted-foreground/60 flex items-center gap-2 font-serif text-xs tracking-[0.16em] uppercase">
        <Loader2 className="text-accent h-3 w-3 animate-spin" />
        <span>
          {localMode ? "Reading your local journal…" : "Gathering insights…"}
        </span>
      </div>

      <Card className="border-border overflow-hidden rounded-xl border">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="border-border/70 border-t border-l p-4 first:border-t-0 first:border-l-0 sm:p-6 md:first:border-l"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-9 w-16" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border rounded-xl border p-6">
        <Skeleton className="h-64 w-full" />
      </Card>
    </div>
  );
}
