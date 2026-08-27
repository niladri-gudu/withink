import { Card, CardContent, CardHeader } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";

import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

export default function DashboardLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        runningHead="Today"
        eyebrow="writer's page, one day at a time"
        title="Good morning,"
        accent="writer."
        description="A fresh page for today's reflection"
      />

      {/* Dashboard hero: Today card (dominant) + streak margin note */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Today's Reflection card */}
        <Card className="border-border/60 bg-card/60 relative flex flex-col overflow-hidden border md:col-span-2">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6 pt-2">
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[85%]" />
            </div>
            {/* The blank page: ruled lines waiting for ink */}
            <div className="space-y-3 pt-2" aria-hidden="true">
              <div className="border-border/80 border-t" />
              <div className="border-border/50 border-t" />
              <div className="border-border/30 border-t" />
            </div>
            {/* Thumb-sized primary CTA */}
            <Skeleton className="h-11 w-full rounded-xl sm:h-10 sm:w-36" />
          </CardContent>
        </Card>

        {/* Streak margin note */}
        <Card className="border-border/60 bg-card/60 flex flex-col justify-between border p-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="my-6 flex items-end gap-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-10 w-12 animate-pulse" />
            <Skeleton className="h-4 w-20 pb-1" />
          </div>
          <Skeleton className="h-3 w-full" />
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Flashback */}
        <Card className="border-border/60 bg-card/60 space-y-4 border p-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="space-y-2.5 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[96%]" />
            <Skeleton className="h-4 w-[88%]" />
          </div>
        </Card>

        {/* Recent Reflections */}
        <Card className="border-border/60 bg-card/60 space-y-4 border p-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="divide-border/60 divide-y pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-3 w-5 shrink-0" />
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="w-full max-w-[150px] space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageLoadingShell>
  );
}
