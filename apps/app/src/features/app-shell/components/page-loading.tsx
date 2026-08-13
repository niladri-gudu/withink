/**
 * Standard page container used by every route skeleton, matching the real
 * pages' max-width, padding, and vertical rhythm so the loading state occupies
 * the exact same footprint as the loaded content.
 */
export function PageLoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in mx-auto w-full max-w-5xl flex-grow space-y-8 p-6 duration-300 md:p-10">
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
  eyebrow,
  title,
  accent,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <span className="text-muted-foreground/70 block font-hand text-lg">
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
    </header>
  );
}
