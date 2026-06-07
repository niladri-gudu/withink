/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  LayoutDashboard,
  ChevronDown,
  History,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Entry {
  date: string;
  title: string;
  wordCount: number;
  mood: number | null;
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
  return new Date(Number(year), Number(month) - 1)
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

export function JournalSidebar({
  entries: initialEntries,
  selectedDate,
  today,
  onSelect,
  onClose,
}: Props) {
  const [loadedEntries, setLoadedEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoadedEntries([]);
    setPage(1);
    setHasMore(true);
  }, [initialEntries]);

  const allEntries = useMemo(() => {
    const map = new Map<string, Entry>();
    loadedEntries.forEach((e) => map.set(e.date, e));
    initialEntries.forEach((e) => map.set(e.date, e));
    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [initialEntries, loadedEntries]);

  const fetchMoreEntries = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/entries?page=${nextPage}&limit=15`);
      const data = await res.json();
      if (data.entries.length === 0) {
        setHasMore(false);
      } else {
        setLoadedEntries((prev) => [...prev, ...data.entries]);
        setPage(nextPage);
        if (data.pagination && nextPage >= data.pagination.totalPages) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to load more entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreEntries();
        }
      },
      { threshold: 1.0 },
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [fetchMoreEntries]);

  const grouped = groupByMonth(allEntries);
  const hasTodayEntry = allEntries.some((e) => e.date === today);

  return (
    <div className="flex flex-col h-full bg-background/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-r border-border/40 shadow-2xl lg:shadow-none">
      <div className="flex-1 overflow-y-auto py-5 sm:py-8 px-3 sm:px-4 space-y-6 sm:space-y-10 no-scrollbar pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        {/* NAV SECTION */}
        <div className="space-y-3">
          <p className="text-[9px] sm:text-[10px] font-mono font-bold text-muted-foreground/40 uppercase tracking-[0.24em] sm:tracking-[0.3em] px-3">
            Navigation
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={cn(
              "w-full justify-start h-auto gap-3 sm:gap-4 px-4 py-3.5 sm:py-4 rounded-2xl transition-all duration-500 group",
              selectedDate === null
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "p-2 rounded-xl transition-all duration-500",
                selectedDate === null
                  ? "bg-primary text-primary-foreground shadow-sm scale-110"
                  : "bg-muted group-hover:bg-background",
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span
                className={cn(
                  "text-sm font-bold tracking-tight transition-colors",
                  selectedDate === null
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                Dashboard
              </span>
            </div>
          </Button>
        </div>

        {/* ACTIVE SECTION */}
        <div className="space-y-3">
          <p className="text-[9px] sm:text-[10px] font-mono font-bold text-muted-foreground/40 uppercase tracking-[0.24em] sm:tracking-[0.3em] px-3">
            Current Session
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              const existingToday = allEntries.find((e) => e.date === today);
              onSelect(
                existingToday ?? {
                  date: today,
                  title: "",
                  wordCount: 0,
                  mood: null,
                  preview: "",
                  contentHtml: "",
                },
              );
              onClose();
            }}
            className={cn(
              "w-full h-auto text-left justify-start px-4 sm:px-5 py-4 sm:py-5 rounded-2xl border group",
              selectedDate === today
                ? "bg-primary/5 border-primary text-foreground"
                : hasTodayEntry
                  ? "border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  : "border-dashed border-muted-foreground/20 bg-transparent text-muted-foreground/60 hover:bg-muted/10",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <PenLine
                  className={cn(
                    "h-3.5 w-3.5",
                    selectedDate === today || hasTodayEntry
                      ? "text-primary"
                      : "text-muted-foreground/40",
                  )}
                />
                <span className="text-sm font-bold tracking-tight">
                  {hasTodayEntry ? "Today's Archive" : "New Entry"}
                </span>
              </div>
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all duration-500",
                  selectedDate === today
                    ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]"
                    : "bg-muted-foreground/20",
                )}
              />
            </div>
          </Button>
        </div>

        {/* ARCHIVE SECTION */}
        <div className="space-y-6">
          <p className="text-[9px] sm:text-[10px] font-mono font-bold text-muted-foreground/40 uppercase tracking-[0.24em] sm:tracking-[0.3em] px-3">
            Archives
          </p>
          <div className="space-y-4">
            {Object.entries(grouped).map(([monthKey, monthEntries]) => {
              const historicalEntries = monthEntries.filter(
                (e) => e.date !== today,
              );
              if (historicalEntries.length === 0) return null;
              const [tYear, tMonth] = today.split("-");
              const isCurrentMonth =
                monthKey === `${tYear}-${tMonth.padStart(2, "0")}`;
              const containsSelected = historicalEntries.some(
                (e) => e.date === selectedDate,
              );

              return (
                <Collapsible
                  key={monthKey}
                  defaultOpen={isCurrentMonth || containsSelected}
                  className="space-y-2 group/collapsible"
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full px-3 py-1 group/trigger">
                      <div className="flex items-center gap-2">
                        <History className="h-3 w-3 text-muted-foreground/30" />
                        <span className="text-[10px] font-mono font-bold text-muted-foreground/60 tracking-wider">
                          {formatMonthLabel(monthKey)}
                        </span>
                      </div>
                      <ChevronDown className="h-3 w-3 text-muted-foreground/30 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    {historicalEntries.map((entry) => {
                      const isSelected = entry.date === selectedDate;
                      
                      {/* --- Timezone Safe Date Splitting --- */}
                      const [year, month, day] = entry.date.split("-");
                      const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short" });
                      
                      return (
                        <Button
                          key={entry.date}
                          variant="ghost"
                          onClick={() => {
                            onSelect(entry);
                            onClose();
                          }}
                          className={cn(
                            "w-full h-auto text-left justify-start px-3 py-3 rounded-2xl transition-all duration-300 flex items-center gap-3 sm:gap-4 border border-transparent",
                            isSelected
                              ? "bg-muted border-border/60 text-foreground shadow-sm"
                              : "hover:bg-muted/40 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <div
                            className={cn(
                              "shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center transition-all duration-500",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground",
                            )}
                          >
                            <span className="text-[10px] font-mono opacity-60 leading-none mb-0.5 uppercase">
                              {monthName}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {day}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] sm:text-[14px] font-bold truncate tracking-tight">
                              {entry.title || "Untitled.Archive"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 truncate">
                              <span
                                className={cn(
                                  "text-[9px] sm:text-[10px] font-mono uppercase tracking-tighter shrink-0",
                                  isSelected
                                    ? "text-foreground/80"
                                    : "text-muted-foreground/70",
                                )}
                              >
                                {entry.wordCount} words
                              </span>
                              <span className="text-[10px] opacity-30 shrink-0">
                                •
                              </span>
                              <span
                                className={cn(
                                  "text-[9px] sm:text-[10px] truncate italic font-medium",
                                  isSelected
                                    ? "text-foreground/80"
                                    : "text-muted-foreground/70",
                                )}
                              >
                                {entry.preview || "Empty.Archive"}
                              </span>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <div
          ref={observerRef}
          className="py-10 flex flex-col items-center gap-6"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
          ) : (
            !hasMore && (
              <div className="flex flex-col items-center gap-3 animate-in fade-in duration-1000">
                <div className="h-px w-8 bg-muted-foreground/20" />
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-mono font-bold text-muted-foreground/30 uppercase tracking-[0.24em] sm:tracking-[0.4em] sm:ml-[0.4em]">
                    End.of.Logs
                  </p>
                  <p className="text-[8px] font-mono text-muted-foreground/20 uppercase tracking-widest mt-1">
                    Your history is finalized
                  </p>
                </div>
                <div className="h-px w-8 bg-muted-foreground/20" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
