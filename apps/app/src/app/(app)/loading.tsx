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
        eyebrow="a fresh page for today"
        title="Good morning,"
        accent="writer."
        description="Welcome back to your private writing sanctuary"
      />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Today's Reflection card */}
        <Card className="border-border/60 bg-card/40 relative flex flex-col overflow-hidden border backdrop-blur-sm md:col-span-2">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-6 pt-2">
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[85%]" />
            </div>
            <Skeleton className="h-10 w-36 rounded-full" />
          </CardContent>
        </Card>

        {/* Quick stats/streak */}
        <Card className="border-border/60 bg-card/40 flex flex-col justify-between border p-6 backdrop-blur-sm">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex flex-grow flex-col items-center justify-center space-y-3 py-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-12 animate-pulse" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Flashback */}
        <Card className="border-border/60 bg-card/40 space-y-4 border p-6 backdrop-blur-sm">
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
        <Card className="border-border/60 bg-card/40 space-y-4 border p-6 backdrop-blur-sm">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-1">
                <div className="flex w-full items-center gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="w-full max-w-[150px] space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageLoadingShell>
  );
}
