"use client";

import { Card } from "@withink/ui/card";
import { cn } from "@withink/utils";

interface EntriesFolioProps {
  streakData: {
    currentStreak: number;
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  };
  className?: string;
}

/**
 * The calendar's at-a-glance metrics. One component, two settings sharing a
 * single data source: phones read it as a one-line folio row under the
 * compact month pager; md+ keeps the ruled three-up stat card (the original
 * desktop presentation, unchanged).
 */
export function EntriesFolio({ streakData, className }: EntriesFolioProps) {
  const stats = [
    { label: "Streak", value: streakData.currentStreak },
    { label: "Entries", value: streakData.totalEntries },
    { label: "Avg words", value: streakData.averageWords },
  ];

  return (
    <>
      {/* Phone: one-line folio row */}
      <p
        className={cn(
          "text-muted-foreground/70 border-border/60 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl border px-4 py-3 font-serif text-sm lg:hidden",
          className,
        )}
      >
        {stats.map((stat, idx) => (
          <span key={stat.label} className="flex items-baseline gap-1.5">
            {idx > 0 && (
              <span aria-hidden="true" className="text-border mr-2">
                ·
              </span>
            )}
            <span className="text-foreground font-bold">{stat.value}</span>
            <span className="text-running-head">{stat.label}</span>
          </span>
        ))}
      </p>

      {/* Desktop: ruled three-up card */}
      <Card
        className={cn(
          "border-border hidden overflow-hidden rounded-xl border lg:block",
          className,
        )}
      >
        <div className="grid grid-cols-3">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className={cn(
                "border-border/70 p-4 text-center",
                idx > 0 && "border-border/70 border-l",
              )}
            >
              <span className="text-foreground font-serif text-3xl font-bold">
                {stat.value}
              </span>
              <p className="text-running-head text-muted-foreground/70 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
