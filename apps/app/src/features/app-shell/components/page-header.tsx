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
}: PageHeaderProps) {
  const today = formatDisplayDate(getLocalDateString(), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header>
      {/* Running head: folio name + date, ruled below */}
      <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
          {runningHead}
        </span>
        <span className="text-muted-foreground/50 font-hand text-base leading-none">
          {today}
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
            <span className="text-accent mt-1 block pl-1 text-4xl font-normal italic sm:mt-0 sm:inline sm:text-5xl">
              {accent}
            </span>
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
