import { Skeleton } from "@withink/ui/skeleton";

export default function EntryEditorLoading() {
  return (
    <div className="animate-in fade-in flex min-h-screen w-full flex-col duration-300">
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 pt-16 pb-[40vh] sm:px-6 sm:pt-24">
        {/* Title row + back button */}
        <div className="flex items-start justify-between gap-3 sm:gap-6">
          <Skeleton className="h-12 w-2/3 max-w-md sm:h-14" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:h-12 sm:w-12" />
        </div>

        {/* Metadata bar (date + mood) */}
        <div className="border-border/10 mt-2 flex items-center justify-between gap-4 border-y py-4">
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
