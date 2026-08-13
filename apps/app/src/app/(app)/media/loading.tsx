import { Card, CardContent } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";

import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

export default function MediaLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        eyebrow="keepsakes pressed between the pages"
        title="Memory"
        accent="gallery."
        description="Revisit and manage all pictures attached to your entries"
      />

      <div className="space-y-6">
        {/* Storage stats card */}
        <Card className="border-border/60 bg-card/40 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-md">
          <CardContent className="flex flex-col justify-between gap-5 p-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
            <div className="flex-1 space-y-2 md:max-w-md">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <Skeleton className="hidden h-9 w-9 shrink-0 rounded-xl md:block" />
          </CardContent>
        </Card>

        {/* Search + controls row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full rounded-xl sm:max-w-xs" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="border-border/60 aspect-square w-full rounded-2xl border"
            />
          ))}
        </div>
      </div>
    </PageLoadingShell>
  );
}
