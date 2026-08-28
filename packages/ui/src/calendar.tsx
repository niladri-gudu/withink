"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import type { DayButtonProps } from "react-day-picker";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@withink/utils";

import { buttonVariants } from "./button";

function CalendarDayButton({
  className,
  modifiers,
  ...props
}: DayButtonProps & { className?: string }) {
  return (
    <button
      {...props}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "size-8 cursor-pointer rounded-md p-0 font-normal transition-colors",
        modifiers.selected &&
          "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        modifiers.today && "text-accent",
        modifiers.outside && "text-muted-foreground/40",
        modifiers.disabled && "text-muted-foreground/30 opacity-50",
        className,
      )}
    />
  );
}

/**
 * The one month calendar (shadcn pattern on react-day-picker, token-styled):
 * weekday headers in the running-head voice, flat ghost day buttons, the
 * accent carrying selection and today. Composed inside a PopoverContent by
 * consumers; never ships its own overlay chrome.
 */
function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        // Keys mirror react-day-picker's UI element names (v10 `UI` enum
        // values) so consumers can still override via `classNames`.
        root: "w-fit",
        months: "relative flex flex-col gap-4 sm:flex-row sm:gap-6",
        month: "flex flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-7 cursor-pointer p-0 text-muted-foreground hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-7 cursor-pointer p-0 text-muted-foreground hover:text-foreground",
        ),
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-caption text-foreground font-serif",
        dropdowns: "flex h-7 items-center justify-center gap-3",
        month_grid: "mt-4 border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground/60 w-8 text-[0.7rem] font-medium tracking-[0.08em] uppercase",
        week: "mt-1.5 flex w-full",
        day: "relative h-8 w-8 p-0 text-center text-sm",
        day_button: "size-8",
        footer: "text-caption text-muted-foreground/70 mt-3 text-center",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : orientation === "right" ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
