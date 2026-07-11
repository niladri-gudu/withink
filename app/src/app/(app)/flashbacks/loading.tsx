import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoadingHeader } from "@/features/app-shell/components/page-loading";

export default function FlashbacksLoading() {
  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      <PageLoadingHeader
        eyebrow="Memory Resurfacing • Flashbacks"
        title="Past"
        accent="flashbacks."
        description="Reconnect with your past reflections"
        action={<Skeleton className="h-9 w-28 rounded-full" />}
      />

      <Card className="bg-card/60">
        <CardHeader className="space-y-3 pb-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-2/3 max-w-sm" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${[100, 96, 92, 98, 88, 60][i]}%` }}
            />
          ))}
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
