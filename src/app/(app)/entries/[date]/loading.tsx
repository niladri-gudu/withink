import { Skeleton } from "@/components/ui/skeleton";

export default function EntryEditorLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col animate-in fade-in duration-300">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-[40vh] w-full flex-grow">
        {/* Title row + back button */}
        <div className="flex items-start justify-between gap-3 sm:gap-6">
          <Skeleton className="h-12 sm:h-14 w-2/3 max-w-md" />
          <Skeleton className="h-9 w-9 sm:h-12 sm:w-12 shrink-0 rounded-full" />
        </div>

        {/* Metadata bar (date + mood) */}
        <div className="flex items-center justify-between gap-4 py-4 mt-2 border-y border-border/10">
          <Skeleton className="h-3 w-48" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full" />
            ))}
          </div>
        </div>

        {/* Writing body */}
        <div className="mt-10 space-y-4">
          {[100, 96, 88, 100, 92, 70, 100, 84].map((w, i) => (
            <Skeleton key={i} className="h-5" style={{ width: `${w}%` }} />
          ))}
        </div>
      </main>
    </div>
  );
}
