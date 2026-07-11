"use client";

import { Frown, Meh, Smile, SmilePlus, Angry } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const moods = [
  {
    value: 1,
    label: "Angry",
    icon: Angry,
    activeClass: "text-mood-1 bg-mood-1-bg border-mood-1-border",
    hoverClass: "hover:text-mood-1 hover:bg-mood-1-bg/50",
  },
  {
    value: 2,
    label: "Sad",
    icon: Frown,
    activeClass: "text-mood-2 bg-mood-2-bg border-mood-2-border",
    hoverClass: "hover:text-mood-2 hover:bg-mood-2-bg/50",
  },
  {
    value: 3,
    label: "Neutral",
    icon: Meh,
    activeClass: "text-mood-3 bg-mood-3-bg border-mood-3-border",
    hoverClass: "hover:text-mood-3 hover:bg-mood-3-bg/50",
  },
  {
    value: 4,
    label: "Happy",
    icon: Smile,
    activeClass: "text-mood-4 bg-mood-4-bg border-mood-4-border",
    hoverClass: "hover:text-mood-4 hover:bg-mood-4-bg/50",
  },
  {
    value: 5,
    label: "Radiant",
    icon: SmilePlus,
    activeClass: "text-mood-5 bg-mood-5-bg border-mood-5-border",
    hoverClass: "hover:text-mood-5 hover:bg-mood-5-bg/50",
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
          <motion.button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected === m.value}
            aria-label={m.label}
            onClick={() => onSelect(m.value)}
            title={m.label}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn(
              "p-2 rounded-xl transition-all duration-300 border border-transparent cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected === m.value
                ? m.activeClass
                : cn("text-muted-foreground/45", m.hoverClass),
            )}
          >
            <m.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
