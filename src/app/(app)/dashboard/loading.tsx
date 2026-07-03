import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoadingShell } from "@/features/app-shell/components/page-loading";

export default function DashboardLoading() {
  return (
    <PageLoadingShell>
      {/* Header (greeting depends on the user's name, so skeleton it) */}
      <header className="space-y-2">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </header>

      {/* Top grid: Today's Reflection (2 cols) + Stats (1 col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 flex flex-col bg-card/60">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-2 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-10 w-40 rounded-full" />
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between bg-card/60">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-center items-center py-6 space-y-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-9 w-12" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid: Flashback + Recent Reflections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <Card key={i} className="bg-card/60">
            <CardHeader className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLoadingShell>
  );
}
