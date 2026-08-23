import { Skeleton } from "@withink/ui/skeleton";

/**
 * Server-rendered placeholder shown in place of page content while the diary
 * lock is engaged. The client lock overlay covers it, so this exists purely
 * to keep entry payloads out of the HTML/RSC stream for locked sessions and
 * to give the post-unlock refresh something calm to land on.
 */
export function LockedContentPlaceholder() {
  return (
    <div className="w-full space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="rounded-xl border p-6 sm:p-8">
        <div className="space-y-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl border" />
        <Skeleton className="h-24 rounded-xl border" />
      </div>
    </div>
  );
}
