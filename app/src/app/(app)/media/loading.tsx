import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoadingShell, PageLoadingHeader } from "@/features/app-shell/components/page-loading";

export default function MediaLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        eyebrow="Attachment Library • Photos"
        title="Memory"
        accent="gallery."
        description="Revisit and manage all pictures attached to your entries"
      />

      <div className="space-y-6">
        {/* Storage stats card */}
        <Card className="border-border/60 bg-card/40 rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
            <Skeleton className="h-2.5 w-full md:w-64 rounded-full" />
          </CardContent>
        </Card>

        {/* Search + controls row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full sm:max-w-xs rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageLoadingShell>
  );
}
