/**
 * Standard page container used by every route skeleton, matching the real
 * pages' max-width, padding, and vertical rhythm so the loading state occupies
 * the exact same footprint as the loaded content.
 */
export function PageLoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      {children}
    </div>
  );
}

/**
 * Renders a page's real eyebrow + serif title immediately (they need no data),
 * grounding the skeleton with a genuine sense of place. `title` and `accent`
 * mirror the two-tone headline pattern shared across the app.
 */
export function PageLoadingHeader({
  runningHead,
  eyebrow,
  title,
  accent,
  description,
  action,
}: {
  runningHead: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header>
      <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="text-running-head text-muted-foreground/70">
          {runningHead}
        </span>
        <span className="text-muted-foreground/50 font-hand text-base leading-none">
          opening the page…
        </span>
      </div>
      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-muted-foreground/70 font-hand block text-lg">
            {eyebrow}
          </span>
          <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
            {title}{" "}
            <span className="text-accent mt-1 block pl-1 text-4xl font-normal italic sm:mt-0 sm:inline sm:text-5xl">
              {accent}
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            {description}
          </p>
        </div>
        {action}
      </div>
    </header>
  );
}
