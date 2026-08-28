import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

export default function NotebooksLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        runningHead="Notebooks"
        eyebrow="every journal, kept in its place"
        title="Your"
        accent="shelf"
        description="Each day's reflection is filed into one notebook."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-card h-52 animate-pulse rounded-xl border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="bg-muted/60 h-2.5 w-6 rounded" />
              <div className="border-border/60 flex-1 border-t border-dashed" />
            </div>
            <div className="bg-muted/60 mt-4 h-6 w-2/3 rounded-md" />
            <div className="bg-muted/60 mt-2 h-2.5 w-1/2 rounded" />
            <div className="mt-8 space-y-2.5" aria-hidden="true">
              <div className="border-border/80 border-t" />
              <div className="border-border/50 border-t" />
              <div className="border-border/30 border-t" />
            </div>
          </div>
        ))}
      </div>
    </PageLoadingShell>
  );
}
