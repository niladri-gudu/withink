import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col p-6 md:p-8 space-y-6 max-w-4xl mx-auto justify-center">
      {/* simulated header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* simulated writing card */}
      <div className="flex-1 space-y-4 rounded-xl border border-border p-6 bg-card/50">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <div className="pt-4 space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* simulated footer */}
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
