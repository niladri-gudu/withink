import { Skeleton } from "@withink/ui/skeleton";

import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

/** One settings section card: icon tile + serif title + description, then body rows. */
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="border-border/60 bg-card/60 relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mt-7 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        runningHead="Settings"
        eyebrow="tune the desk to suit the writer"
        title="Diary"
        accent="settings."
        description="Adjust your writing experience and preferences"
      />

      <div className="w-full space-y-6">
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={1} />
      </div>
    </PageLoadingShell>
  );
}
