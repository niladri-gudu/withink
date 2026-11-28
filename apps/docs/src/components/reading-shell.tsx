import Link from "next/link";

import { cn } from "@withink/utils";

interface ReadingPageProps {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  /** Extra container classes (e.g. a wider max-width for pricing). */
  className?: string;
  /** Show the "← Back to withink." trail (default true). */
  backLink?: boolean;
}

/**
 * Shared Field Ledger reading layout for the docs pages: a running-head
 * eyebrow, serif headline, and a ledger-paper card with a hairline edge.
 * Every reading page renders inside `<main id="content">` so the skip link and
 * the single H1 live here.
 */
export function ReadingPage({
  eyebrow,
  title,
  intro,
  children,
  className,
  backLink = true,
}: ReadingPageProps) {
  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(
        "relative flex flex-1 flex-col px-4 py-10 focus:outline-none md:py-16",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="ledger-rules pointer-events-none absolute inset-0"
      />
      <article className="relative mx-auto w-full max-w-2xl">
        <header className="mb-8 space-y-3">
          <p className="text-accent font-serif text-xs font-medium tracking-[0.22em] uppercase">
            {eyebrow}
          </p>
          <h1 className="text-h1 text-foreground font-serif font-bold tracking-tight text-balance">
            {title}
          </h1>
          {intro ? (
            <div className="text-subtitle text-muted-foreground font-serif leading-relaxed text-pretty">
              {intro}
            </div>
          ) : null}
        </header>

        <div className="border-border bg-card text-body-small text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground space-y-6 rounded-xl border px-6 py-8 font-serif leading-relaxed md:px-10 md:py-10 [&_h2]:!mt-0 [&_h2]:pt-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-serif [&_h3]:text-base [&_h3]:font-bold">
          {children}
        </div>

        {backLink ? (
          <div className="mt-8">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-2 inline-flex min-h-11 items-center rounded px-2 font-serif text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              ← Back to withink.
            </Link>
          </div>
        ) : null}
      </article>
    </main>
  );
}
