"use client";

import { useState } from "react";
import { Button } from "@withink/ui/button";
import { IconButton } from "@withink/ui/icon-button";
import { Select } from "@withink/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@withink/ui/sheet";
import { cn } from "@withink/utils";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";

export type TimeFilter = "all" | "week" | "month";

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const MOOD_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All moods" },
  { value: "1", label: "Angry" },
  { value: "2", label: "Sad" },
  { value: "3", label: "Neutral" },
  { value: "4", label: "Happy" },
  { value: "5", label: "Radiant" },
];

interface EntriesControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (value: TimeFilter) => void;
  moodFilter: string;
  onMoodFilterChange: (value: string) => void;
}

/**
 * Sticky search + filter entry point for the reflections timeline. On phones
 * the search pins under the page header while the list scrolls; the mood and
 * time-range filters live one tap deeper in a bottom Sheet of toggle chips
 * (the Phase-3 decision — chips here, the shared native Select everywhere a
 * single value is picked). Desktop keeps both inline in the toolbar row.
 */
export function EntriesControls({
  search,
  onSearchChange,
  timeFilter,
  onTimeFilterChange,
  moodFilter,
  onMoodFilterChange,
}: EntriesControlsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCount =
    (timeFilter !== "all" ? 1 : 0) + (moodFilter !== "all" ? 1 : 0);

  return (
    <div className="bg-background/95 sticky top-0 z-20 -mx-2 px-2 py-2 backdrop-blur-sm">
      {/* Phone: search + filters trigger (filters open the sheet) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="relative flex-1">
          <Search className="text-muted-foreground/60 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search title, text, date…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search entries"
            autoComplete="off"
            enterKeyHint="search"
            className="bg-card border-border placeholder:text-muted-foreground/50 focus-visible:ring-ring h-11 w-full rounded-xl border pr-4 pl-9 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>
        <div className="relative shrink-0">
          <IconButton
            variant="outline"
            aria-label={
              activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"
            }
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </IconButton>
          {activeCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-accent text-accent-foreground absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-serif text-[10px] font-bold"
            >
              {activeCount}
            </span>
          )}
        </div>
      </div>

      {/* Phone: active-filter chips summary row */}
      {activeCount > 0 && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto lg:hidden">
          {TIME_OPTIONS.filter(
            (option) => option.value === timeFilter && timeFilter !== "all",
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onTimeFilterChange("all")}
              aria-label={`Remove ${option.label} filter`}
              className="border-accent/40 bg-accent/5 text-accent inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 font-serif text-xs font-semibold"
            >
              {option.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {MOOD_OPTIONS.filter(
            (option) => option.value === moodFilter && moodFilter !== "all",
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onMoodFilterChange("all")}
              aria-label={`Remove ${option.label} filter`}
              className="border-accent/40 bg-accent/5 text-accent inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 font-serif text-xs font-semibold"
            >
              {option.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {/* Desktop: original inline toolbar (search + selects) */}
      <div className="hidden items-center gap-3 lg:flex">
        <div className="relative flex-grow">
          <Search className="text-muted-foreground/60 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, contents, date…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search entries"
            autoComplete="off"
            className="bg-card border-border placeholder:text-muted-foreground/50 focus-visible:ring-ring h-10 w-full rounded-xl border pr-4 pl-9 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>
        <Select
          value={timeFilter}
          onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
          aria-label="Filter by time range"
        >
          {TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={moodFilter}
          onChange={(e) => onMoodFilterChange(e.target.value)}
          aria-label="Filter by mood"
        >
          {MOOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Filter sheet (phones): chip rows for time range and mood */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="gap-5">
          <SheetHeader>
            <SheetTitle>Filter reflections</SheetTitle>
            <SheetDescription>
              Narrow the archive by when it was written and how it felt.
            </SheetDescription>
          </SheetHeader>

          <fieldset className="space-y-3">
            <legend className="text-running-head text-muted-foreground/70">
              Time range
            </legend>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((option) => {
                const active = timeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onTimeFilterChange(option.value)}
                    className={cn(
                      "focus-visible:ring-ring inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 font-serif text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      active
                        ? "border-accent bg-accent/5 ring-accent/30 text-foreground ring-1"
                        : "border-border text-muted-foreground hover:border-accent/50 hover:bg-secondary/40",
                    )}
                  >
                    {active && <Check className="text-accent h-3.5 w-3.5" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-running-head text-muted-foreground/70">
              Mood
            </legend>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((option) => {
                const active = moodFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onMoodFilterChange(option.value)}
                    className={cn(
                      "focus-visible:ring-ring inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 font-serif text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      active
                        ? "border-accent bg-accent/5 ring-accent/30 text-foreground ring-1"
                        : "border-border text-muted-foreground hover:border-accent/50 hover:bg-secondary/40",
                    )}
                  >
                    {active && <Check className="text-accent h-3.5 w-3.5" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                onTimeFilterChange("all");
                onMoodFilterChange("all");
              }}
              disabled={activeCount === 0}
            >
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              Show reflections
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
