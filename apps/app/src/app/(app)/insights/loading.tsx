import { Card } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";

import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

export default function InsightsLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        eyebrow="System Analysis • Private Stats"
        title="Private"
        accent="insights."
        description="A calm, private analysis of your writing patterns and moods. These statistics remain entirely local to your account."
      />

      {/* Four stat cards */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="border-border/60 bg-card/40 relative space-y-4 overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm"
          >
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </Card>
        ))}
      </section>

      {/* Heatmap */}
      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Card className="border-border/60 bg-card/40 relative overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 120 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-3.5 rounded-sm" />
            ))}
          </div>
        </Card>
      </section>

      {/* Mood patterns */}
      <section className="space-y-4">
        <Skeleton className="h-5 w-64" />
        <Card className="border-border/60 bg-card/40 relative overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm md:p-8">
          <Skeleton className="h-56 w-full rounded-lg" />
        </Card>
      </section>

      {/* Word count + activity */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/60 bg-card/40 relative overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm md:col-span-2">
          <Skeleton className="h-48 w-full rounded-lg" />
        </Card>
        <Card className="border-border/60 bg-card/40 relative overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm">
          <Skeleton className="h-48 w-full rounded-lg" />
        </Card>
      </section>
    </PageLoadingShell>
  );
}
