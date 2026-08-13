import { Card } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";

import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

export default function EntriesLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        eyebrow="the archive, kept in order"
        title="All"
        accent="reflections."
        description="Browse and search your journal history"
        action={<Skeleton className="h-10 w-32 rounded-full" />}
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        {/* Calendar + stats (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/60 bg-card/40 relative space-y-4 overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-sm">
            {/* Calendar month header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 42 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Timeline (2/3) */}
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card
              key={i}
              className="border-border/60 bg-card/40 relative overflow-hidden rounded-2xl border p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageLoadingShell>
  );
}
