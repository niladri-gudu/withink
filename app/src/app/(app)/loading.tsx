import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoadingShell, PageLoadingHeader } from "@/features/app-shell/components/page-loading";

export default function DashboardLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        eyebrow="Sanctuary Overview • Today"
        title="Good morning,"
        accent="writer."
        description="Welcome back to your private writing sanctuary"
      />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Reflection card */}
        <Card className="md:col-span-2 flex flex-col border border-border/60 bg-card/40 backdrop-blur-sm relative overflow-hidden">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-2 space-y-6">
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[85%]" />
            </div>
            <Skeleton className="h-10 w-36 rounded-full" />
          </CardContent>
        </Card>

        {/* Quick stats/streak */}
        <Card className="flex flex-col justify-between border border-border/60 bg-card/40 backdrop-blur-sm p-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex-grow flex flex-col justify-center items-center py-6 space-y-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-12 animate-pulse" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flashback */}
        <Card className="border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-4">
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
        <Card className="border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-1">
                <div className="flex items-center gap-3 w-full">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 w-full max-w-[150px]">
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
