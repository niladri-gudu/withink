import { Skeleton } from "@withink/ui/skeleton";

/**
 * Lightweight placeholder shown while the Tiptap editor chunk streams in.
 * Mirrors the fullscreen `/entries/[date]` surface exactly — sticky header
 * row (back · date · save state · zen), title, 44px mood row, ruled body,
 * floating toolbar silhouette — so the dynamic import's fallback occupies
 * the same footprint as the loaded editor.
 */
export function EditorSkeleton() {
  return (
    <div className="animate-in fade-in relative flex min-h-full w-full flex-col duration-300">
      {/* Header row */}
      <div className="border-border/40 bg-background/85 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-3xl items-center gap-2 px-3 sm:px-6">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <Skeleton className="h-4 w-28" />
          <div className="flex-1" />
          <Skeleton className="h-3 w-24 sm:hidden" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-grow px-4 pt-5 pb-[32vh] sm:px-6 sm:pt-8">
        {/* Title */}
        <Skeleton className="mb-3 h-10 w-2/3 max-w-sm sm:h-12" />

        {/* Mood row (44px targets) */}
        <div className="mb-2 flex items-center gap-1.5 p-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-11 rounded-xl" />
          ))}
        </div>

        {/* Writing body */}
        <div className="mt-8 space-y-4">
          {[100, 96, 88, 100, 92, 70, 100, 84].map((w, i) => (
            <Skeleton key={i} className="h-5" style={{ width: `${w}%` }} />
          ))}
        </div>
      </main>

      {/* Toolbar silhouette — vanishes the moment real chrome mounts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-2 sm:px-4">
        <div className="bg-card/95 flex h-14 items-center gap-2 rounded-xl border px-4 shadow-lg backdrop-blur-md">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-6 rounded-md" />
          ))}
          <Skeleton className="hidden h-5 w-16 rounded-md sm:block" />
        </div>
      </div>
    </div>
  );
}
