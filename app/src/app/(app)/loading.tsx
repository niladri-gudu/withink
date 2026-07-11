import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageLoadingShell } from "@/features/app-shell/components/page-loading";
import { Flame, ArrowRight } from "lucide-react";

export default function DashboardLoading() {
  return (
    <PageLoadingShell>
      {/* Header with static greeting layout, skeletoning only the name */}
      <header className="space-y-1">
        <Skeleton className="h-3.5 w-32 bg-muted/60" />
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Good morning,</span>
          <Skeleton className="h-8 w-28 bg-muted/80 rounded-lg inline-block animate-pulse" />
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Welcome back to your private writing sanctuary
        </p>
      </header>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Entry card skeleton */}
        <Card className="md:col-span-2 flex flex-col border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-serif font-semibold text-foreground">
              Today&apos;s Reflection
            </CardTitle>
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-2 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-10 w-36 rounded-full mt-2" />
          </CardContent>
        </Card>

        {/* Stats card skeleton */}
        <Card className="flex flex-col justify-between border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif font-semibold text-foreground">Sanctuary Stats</CardTitle>
            <CardDescription>Consistency tracking</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-center items-center py-6 space-y-3">
            <div className="relative">
              <Flame className="h-16 w-16 text-muted-foreground/15" />
            </div>
            <Skeleton className="h-9 w-12 rounded-lg" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
              Day Streak
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flashback Card skeleton */}
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary/30 font-semibold">
              Flashback
            </span>
            <CardTitle className="text-lg font-serif font-semibold text-foreground">
              Anniversary Flashback
            </CardTitle>
            <Skeleton className="h-4 w-36 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full italic" />
              <Skeleton className="h-4 w-5/6 italic" />
              <Skeleton className="h-4 w-2/3 italic" />
            </div>
            <Skeleton className="h-4 w-28 rounded" />
          </CardContent>
        </Card>

        {/* Recent Reflections Card skeleton */}
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-serif font-semibold text-foreground">Recent Reflections</CardTitle>
            <CardDescription>Your latest journal entries</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-transparent">
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    {/* Circle icon skeleton */}
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/15 shrink-0" />
                </div>
              ))}
              <div className="pt-2 flex justify-end">
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLoadingShell>
  );
}
