/**
 * Hero placeholder shared by the server hero and the local-first hero.
 *
 * It lives outside `dashboard-hero.tsx` because that module imports the
 * server-only `JournalService`; client components (the local hero) cannot
 * import from it without pulling server code into the browser bundle.
 */
export function DashboardHeroSkeleton() {
  return (
    <>
      {/* Today's card + streak margin-note placeholders. The yesterday banner
          is data-dependent, so no placeholder — it streams in without a
          reserved box to avoid a layout jump when absent. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border md:col-span-2" />
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border" />
      </div>
    </>
  );
}
