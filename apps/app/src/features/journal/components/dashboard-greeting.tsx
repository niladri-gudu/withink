"use client";

import * as React from "react";

/** Pure mapping so the boundary is easy to reason about (and test). */
export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

interface DashboardGreetingProps {
  firstName: string;
  /** Running-head date, formatted on the server (same markup as PageHeader). */
  displayDate: string;
}

/**
 * Time-aware dashboard header. The server (and the first client render) paint
 * a neutral "Hello," so the streamed HTML matches hydration exactly; the
 * user's local hour is only read after mount, then the greeting settles.
 */
export function DashboardGreeting({
  firstName,
  displayDate,
}: DashboardGreetingProps) {
  const [greeting, setGreeting] = React.useState("Hello,");

  React.useEffect(() => {
    // Post-mount only: reading the clock during render would hydration-mismatch
    // whenever the server's hour differs from the viewer's.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only time signal, intentionally set after mount
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  // Props are precomputed by the server page so the streamed HTML and the
  // first client render agree exactly; only the greeting settles post-mount.
  return (
    <header>
      <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="text-running-head text-muted-foreground/70">
          Today
        </span>
        <span className="text-muted-foreground/50 font-hand text-base leading-none">
          {displayDate}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
            {firstName}&apos;s page, one day at a time
          </p>
          <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
            {greeting}{" "}
            <span className="text-accent font-normal">{firstName}.</span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            A fresh page for today&apos;s reflection
          </p>
        </div>
      </div>
    </header>
  );
}
