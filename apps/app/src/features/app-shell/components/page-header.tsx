import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small field-note above the heading — e.g. a section label. */
  note?: string;
  /** The heading, with the accent word passed separately for the italic gold treatment. */
  title: string;
  accent: string;
  description: string;
  action?: ReactNode;
}

/**
 * The Field Ledger page header: a serif heading with a gold italic accent
 * word, a quiet description, and an optional action. The eyebrow is a small
 * tracked label in the printed voice — never a mono terminal label.
 */
export function PageHeader({
  note,
  title,
  accent,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        {note && (
          <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
            {note}
          </p>
        )}
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
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
