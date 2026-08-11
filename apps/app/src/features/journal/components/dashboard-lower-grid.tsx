import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";

import { DashboardFlashbackCard } from "@/features/flashbacks/components/flashback-card-content";
import { FlashbackService } from "@/features/flashbacks/services/flashback-service";
import { RecentReflectionsList } from "@/features/journal/components/recent-reflections-list";
import { JournalService } from "@/features/journal/services/journal-service";

interface DashboardLowerGridProps {
  userId: string;
  today: string;
}

/** Skeleton that mirrors the lower dashboard grid while it streams in. */
export function DashboardLowerGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
  );
}

/**
 * Server component that fetches the below-the-fold dashboard sections
 * (flashback + recent reflections) so the top of the page streams in first
 * while these resolve, instead of blocking the whole render.
 */
export default async function DashboardLowerGrid({
  userId,
  today,
}: DashboardLowerGridProps) {
  const [flashback, recentData] = await Promise.all([
    FlashbackService.getFlashbackForToday(userId, today),
    JournalService.getEntriesPage(userId, 1, 3, { today }),
  ]);

  const flashbackEntry = flashback ? flashback.entry : null;
  const flashbackLabel = flashback ? flashback.label : "";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <DashboardFlashbackCard
        entry={flashbackEntry}
        label={flashbackLabel}
        today={today}
      />

      <Card className="border-border bg-card/60 border backdrop-blur-sm" interactive>
        <CardHeader>
          <CardTitle className="text-foreground font-serif text-lg font-semibold">
            Recent Reflections
          </CardTitle>
          <CardDescription>Your latest journal entries</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <RecentReflectionsList
            initialEntries={recentData.entries}
            today={today}
          />
        </CardContent>
      </Card>
    </div>
  );
}
