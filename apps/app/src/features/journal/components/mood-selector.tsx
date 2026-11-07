"use client";

import * as React from "react";
import { cn } from "@withink/utils";
import { Angry, Frown, Meh, Smile, SmilePlus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

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
  const reduceMotion = useReducedMotion();
  const buttonsRef = React.useRef<Array<HTMLButtonElement | null>>([]);
  const focusedIndexRef = React.useRef(
    Math.max(
      0,
      moods.findIndex((m) => m.value === selected),
    ),
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = focusedIndexRef.current;
    let next = current;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (current + 1) % moods.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (current - 1 + moods.length) % moods.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = moods.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    focusedIndexRef.current = next;
    onSelect(moods[next]!.value);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="text-running-head text-muted-foreground/60 mr-1 hidden sm:inline">
        Mood
      </span>
      <div
        role="radiogroup"
        aria-label="Select mood"
        onKeyDown={handleKeyDown}
        className="bg-muted/20 border-border/5 flex items-center gap-1 rounded-xl border p-1"
      >
        {moods.map((m, index) => (
          <motion.button
            key={m.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected === m.value}
            aria-label={m.label}
            // Roving tabindex: one stop for the whole group; arrows move
            // between options (required for role="radiogroup").
            tabIndex={selected === m.value || (selected === null && index === 0) ? 0 : -1}
            onClick={() => onSelect(m.value)}
            onFocus={() => {
              focusedIndexRef.current = index;
            }}
            title={m.label}
            whileHover={reduceMotion ? undefined : { scale: 1.08 }}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 17 }
            }
            className={cn(
              "focus-visible:ring-ring relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-transparent transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:h-10 sm:w-10",
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
