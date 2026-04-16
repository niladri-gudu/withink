"use client";

import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Entry {
  date: string;
  title: string;
  wordCount: number;
  preview: string;
  contentHtml: string;
}

interface Props {
  entries: Entry[];
  selectedDate: string | null;
  userName: string;
  today: string;
  onSelect: (entry: Entry | null) => void;
  onClose: () => void;
}

function groupByMonth(entries: Entry[]) {
  const groups: Record<string, Entry[]> = {};
  for (const entry of entries) {
    const [year, month] = entry.date.split("-");
    const key = `${year}-${month}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function JournalSidebar({
  entries,
  selectedDate,
  userName,
  today,
  onSelect,
}: Props) {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const entryDates = new Set(entries.map((e) => e.date));

  const grouped = groupByMonth(entries);
  const hasTodayEntry = entries.some((e) => e.date === today);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar pb-20">
        {/* 1. DASHBOARD SECTION */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-2">
            Overview
          </p>
          <Button
            variant="ghost"
            onClick={() => onSelect(null)}
            className={cn(
              "w-full justify-start h-auto gap-4 px-4 py-4 rounded-2xl transition-all duration-300 shadow-none border border-transparent",
              selectedDate === null
                ? "bg-foreground text-background hover:bg-foreground hover:text-background cursor-default" // Lock hover state when selected
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/50",
            )}
          >
            <div
              className={cn(
                "p-2 rounded-xl transition-colors",
                selectedDate === null ? "bg-background/10" : "bg-muted",
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold tracking-tight">
                Dashboard
              </span>
              <span
                className={cn(
                  "text-[10px] opacity-60",
                  selectedDate === null
                    ? "text-background/80"
                    : "text-muted-foreground",
                )}
              >
                Review your progress
              </span>
            </div>
          </Button>
        </div>

        {/* 2. TODAY SECTION */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-2">
            Today
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              const existingToday = entries.find((e) => e.date === today);
              onSelect(
                existingToday ?? {
                  date: today,
                  title: "",
                  wordCount: 0,
                  preview: "",
                  contentHtml: "",
                },
              );
            }}
            className={cn(
              "w-full h-auto text-left justify-start px-5 py-6 rounded-[1.75rem] transition-all duration-300 border shadow-none",
              selectedDate === today
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground cursor-default scale-[0.98]"
                : hasTodayEntry
                  ? "border-transparent bg-muted/40 hover:bg-muted/70 text-foreground hover:scale-[1.01]"
                  : "border-dashed border-border bg-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground hover:scale-[1.01]",
            )}
          >
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-black tracking-tight">
                  {hasTodayEntry ? "Today's Entry" : "Start Writing"}
                </p>
                <p
                  className={cn(
                    "text-[11px] opacity-70",
                    selectedDate === today
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {hasTodayEntry
                    ? "Continue reflecting"
                    : "Capture your thoughts"}
                </p>
              </div>
              <div
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  selectedDate === today
                    ? "bg-primary-foreground ring-4 ring-primary-foreground/20"
                    : "bg-primary ring-4 ring-primary/10",
                )}
              />
            </div>
          </Button>
        </div>

        {/* CALENDAR SECTION */}
        {/* <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-2">
            Calendar
          </p>
          <div className="rounded-2xl overflow-hidden bg-muted/30 border border-border/40 p-1">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={(date) => {
                if (!date) return;
                setCalendarDate(date);
                const dateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
                const existing = entries.find((e) => e.date === dateStr);
                if (existing) {
                  onSelect(existing);
                } else {
                  // date in the future or no entry — navigate to editor
                  onSelect({
                    date: dateStr,
                    title: "",
                    wordCount: 0,
                    preview: "",
                    contentHtml: "",
                  });
                }
              }}
              modifiers={{
                hasEntry: (date) => {
                  const dateStr = date.toLocaleDateString("en-CA");
                  return entryDates.has(dateStr);
                },
              }}
              modifiersClassNames={{
                hasEntry:
                  "font-bold underline decoration-primary decoration-2 underline-offset-2",
              }}
              classNames={{
                root: "w-full",
                month: "w-full",
                table: "w-full",
                head_cell:
                  "text-muted-foreground text-[10px] font-bold uppercase tracking-wide w-full",
                cell: "w-full text-center",
                day: "w-full h-8 text-xs rounded-xl hover:bg-accent transition-colors",
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary",
                day_today: "text-primary font-bold",
                nav_button:
                  "h-7 w-7 rounded-xl hover:bg-accent transition-colors",
                caption: "text-xs font-bold text-foreground mb-2",
              }}
            />
          </div>
        </div> */}

        {/* 3. HISTORY SECTION */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([monthKey, monthEntries]) => {
            const historicalEntries = monthEntries.filter(
              (e) => e.date !== today,
            );
            if (historicalEntries.length === 0) return null;

            return (
              <div key={monthKey} className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-2">
                  {formatMonthLabel(monthKey)}
                </p>
                <div className="space-y-1">
                  {historicalEntries.map((entry) => {
                    const isSelected = entry.date === selectedDate;
                    const day = entry.date.split("-")[2];

                    return (
                      <Button
                        key={entry.date}
                        variant="ghost"
                        onClick={() => onSelect(entry)}
                        className={cn(
                          "w-full h-auto text-left justify-start px-3 py-3 rounded-2xl transition-all duration-200 flex items-center gap-4 shadow-none border border-transparent",
                          isSelected
                            ? "bg-foreground text-background hover:bg-foreground hover:text-background cursor-default"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <div

                        
                          className={cn(
                            "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-colors text-xs font-bold",
                            isSelected
                              ? "bg-background/10 border-background/20 text-background"
                              : "bg-muted border-transparent group-hover:border-border text-foreground",
                          )}
                        >
                          {day}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate leading-tight">
                            {entry.title || "Untitled"}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] truncate mt-1 leading-none opacity-60",
                              isSelected
                                ? "text-background/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {entry.wordCount} words •{" "}
                            {entry.preview || "No content"}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
