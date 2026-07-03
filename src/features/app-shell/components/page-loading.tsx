/**
 * Standard page container used by every route skeleton, matching the real
 * pages' max-width, padding, and vertical rhythm so the loading state occupies
 * the exact same footprint as the loaded content.
 */
export function PageLoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
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
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
          {eyebrow}
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none text-foreground">
          {title}{" "}
          <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
            {accent}
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">{description}</p>
      </div>
      {action}
    </header>
  );
}
