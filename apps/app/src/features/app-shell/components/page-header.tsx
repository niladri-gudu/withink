import type { ReactNode } from "react";

import { formatDisplayDate, getLocalDateString } from "@/lib/utils/date";

interface PageHeaderProps {
  /** The current folio/section name, set in the running head (tracked caps). */
  runningHead: string;
  /** The page title. */
  title: string;
  /** The accent word, set in italic gold — the folio's title echo. */
  accent: string;
  /** A quiet line under the title. */
  description?: string;
  /** A hand-written margin note above the title. */
  note?: string;
  /** Optional action, set right in the running head line. */
  action?: ReactNode;
  /** The viewer's local today (ISO). Callers should pass the value resolved
   *  from the `withink-local-date` cookie so users ahead of the server's
   *  timezone don't see yesterday's date; falls back to server time. */
  today?: string;
}

/**
 * The Annotated Codex page header. A printed running head (folio name + date)
 * rules the top of the page; the title sits below in the serif voice with a
 * gold italic accent. The hand note is the only Caveat on the surface.
 */
export function PageHeader({
  runningHead,
  title,
  accent,
  description,
  note,
  action,
  today,
}: PageHeaderProps) {
  const displayDate = formatDisplayDate(today || getLocalDateString(), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header>
      {/* Running head: folio name + date, ruled below */}
      <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="text-running-head text-muted-foreground/70">
          {runningHead}
        </span>
        <span className="text-muted-foreground/50 font-hand text-base leading-none">
          {displayDate}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {note && (
            <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
              {note}
            </p>
          )}
          <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
            {title}{" "}
            <span className="text-accent font-normal">{accent}</span>
          </h1>
          {description && (
            <p className="text-body-small text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
