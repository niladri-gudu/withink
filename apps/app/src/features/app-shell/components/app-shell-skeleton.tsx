import { Skeleton } from "@withink/ui/skeleton";

/**
 * First-paint fallback for the app shell.
 *
 * The layout streams this immediately while the session/lock/encryption gate
 * resolves, so opening the app never starts from a blank screen. It mirrors
 * the desktop margin rail, masthead and content measure of the real shell.
 */
export function AppShellSkeleton() {
  return (
    <div
      className="bg-background flex h-dvh w-full overflow-hidden"
      aria-busy="true"
      aria-label="Opening Withink"
    >
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground focus:border-border focus:ring-ring sr-only text-sm font-medium focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:rounded-xl focus:border focus:px-4 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop margin rail */}
      <aside className="border-border/60 hidden h-full w-[264px] shrink-0 flex-col gap-6 border-r p-6 lg:flex">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2.5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
        <div className="mt-auto space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Masthead */}
        <div className="border-border/60 flex h-16 items-center justify-between border-b px-6">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto w-full max-w-4xl flex-1 px-6 pt-8 pb-8 md:py-12 lg:px-8">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="border-border/70 flex items-baseline justify-between border-b pb-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-52 w-full rounded-2xl" />
                <Skeleton className="h-52 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </main>

        {/* Phone tab bar */}
        <div className="border-border/60 border-t p-3 lg:hidden">
          <div className="flex justify-around">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-16" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
