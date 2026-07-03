import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PageLoadingHeader } from "@/features/app-shell/components/page-loading";

export default function InsightsLoading() {
  return (
    <div className="flex-1 max-w-5xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-300">
      <PageLoadingHeader
        eyebrow="System Analysis • Private Stats"
        title="Private"
        accent="insights."
        description="A calm, private analysis of your writing patterns and moods. These statistics remain entirely local to your account."
      />

      {/* Four stat cards */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60 p-6 space-y-4">
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
        <Card className="border-border/60 p-6">
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
        <Card className="border-border/60 p-6 md:p-8">
          <Skeleton className="h-56 w-full rounded-lg" />
        </Card>
      </section>

      {/* Word count + activity */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/60 p-6 md:col-span-2">
          <Skeleton className="h-48 w-full rounded-lg" />
        </Card>
        <Card className="border-border/60 p-6">
          <Skeleton className="h-48 w-full rounded-lg" />
        </Card>
      </section>
    </div>
  );
}
