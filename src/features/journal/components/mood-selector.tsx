"use client";

import { Frown, Meh, Smile, SmilePlus, Angry } from "lucide-react";
import { cn } from "@/lib/utils";

const moods = [
  {
    value: 1,
    label: "Angry",
    icon: Angry,
    activeClass: "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 border-red-500/20",
    hoverClass: "hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/5",
  },
  {
    value: 2,
    label: "Sad",
    icon: Frown,
    activeClass: "text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20",
    hoverClass: "hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/5",
  },
  {
    value: 3,
    label: "Neutral",
    icon: Meh,
    activeClass: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/20",
    hoverClass: "hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-500/5",
  },
  {
    value: 4,
    label: "Happy",
    icon: Smile,
    activeClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
    hoverClass: "hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/5",
  },
  {
    value: 5,
    label: "Radiant",
    icon: SmilePlus,
    activeClass: "text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20",
    hoverClass: "hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/5",
  },
];

export function MoodSelector({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground/60 font-mono mr-1 hidden sm:inline">
        Mood
      </span>
      <div
        role="radiogroup"
        aria-label="Select mood"
        className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl border border-border/5"
      >
        {moods.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected === m.value}
            aria-label={m.label}
            onClick={() => onSelect(m.value)}
            title={m.label}
            className={cn(
              "p-2 rounded-xl transition-all duration-300 border border-transparent cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected === m.value
                ? m.activeClass
                : cn("text-muted-foreground/45", m.hoverClass),
            )}
          >
            <m.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
