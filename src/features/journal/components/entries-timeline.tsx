"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { 
  Search, 
  Trash2, 
  Calendar, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Angry, Frown, Meh, Smile, SmilePlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEntriesListAction, deleteEntryAction } from "../actions/entry-actions";
import type { DecryptedEntry } from "../services/journal-service";
import { toast } from "sonner";

interface EntriesTimelineProps {
  initialEntries: DecryptedEntry[];
  initialTotal: number;
  localToday: string;
  onEntryDeleted?: () => void;
}

const moodIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: SmilePlus,
};

const moodColors: Record<number, string> = {
  1: "text-red-500 bg-red-500/10 border-red-500/20",
  2: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  3: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  4: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  5: "text-teal-500 bg-teal-500/10 border-teal-500/20",
};

const LIMIT = 5;

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSnippet(text: string, query: string, maxLength: number = 180): string {
  if (!query || !query.trim()) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }

  if (index < maxLength / 3) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }

  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);

  let snippet = text.substring(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const trimmedQuery = query.trim();

  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmedQuery.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function EntriesTimeline({
  initialEntries,
  initialTotal,
  localToday,
  onEntryDeleted,
}: EntriesTimelineProps) {
  const [entries, setEntries] = useState<DecryptedEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month">("all");
  const [isLoading, setIsLoading] = useState(false);
  
  const [deleteDateConfirm, setDeleteDateConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Fetch updated page list on filter change
  useEffect(() => {
    // Skip the first initial render load if no filters are active
    const isFirstRun = page === 1 && !debouncedSearch && moodFilter === "all" && timeFilter === "all";
    if (isFirstRun) return;

    let active = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getEntriesListAction(page, LIMIT, {
          search: debouncedSearch || undefined,
          mood: moodFilter === "all" ? null : Number(moodFilter),
          timeFilter,
          today: localToday,
        });

        if (active && res.success && res.data) {
          setEntries(res.data.entries);
          setTotal(res.data.total);
        }
      } catch (err) {
        console.error("Failed to load entries:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [page, debouncedSearch, moodFilter, timeFilter, localToday]);

  const handleDelete = async (date: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteEntryAction(date);
      if (res.success) {
        toast.success(`Entry for ${formatDate(date)} deleted.`);
        setDeleteDateConfirm(null);
        onEntryDeleted?.();
        
        // Adjust page if we deleted the last item on this page
        if (entries.length === 1 && page > 1) {
          setPage((p) => p - 1);
        } else {
          // Trigger refresh
          const resUpdated = await getEntriesListAction(page, LIMIT, {
            search: debouncedSearch || undefined,
            mood: moodFilter === "all" ? null : Number(moodFilter),
            timeFilter,
            today: localToday,
          });
          if (resUpdated.success && resUpdated.data) {
            setEntries(resUpdated.data.entries);
            setTotal(resUpdated.data.total);
          }
        }
      } else {
        toast.error(res.error || "Failed to delete entry.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search by title, contents, date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border outline-none text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Time range */}
          <select
            value={timeFilter}
            onChange={(e) => {
              setTimeFilter(e.target.value as any); // eslint-disable-line @typescript-eslint/no-explicit-any
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none cursor-pointer focus:border-primary/50 transition-colors"
          >
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>

          {/* Mood filter */}
          <select
            value={moodFilter}
            onChange={(e) => {
              setMoodFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none cursor-pointer focus:border-primary/50 transition-colors"
          >
            <option value="all">All moods</option>
            <option value="1">Angry</option>
            <option value="2">Sad</option>
            <option value="3">Neutral</option>
            <option value="4">Happy</option>
            <option value="5">Radiant</option>
          </select>
        </div>
      </div>

      {/* Timeline entries list */}
      <div className="relative space-y-4">
        {isLoading && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        )}

        {entries.length === 0 ? (
          <Card className="border border-border/80 bg-card/40 py-16 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-4 select-none opacity-60">📭</span>
            <p className="text-serif font-semibold text-lg text-foreground mb-1">
              No matching reflections
            </p>
            <p className="text-body-small text-muted-foreground max-w-sm">
              Adjust your search query or filters to find older journal logs, or write a new entry.
            </p>
          </Card>
        ) : (
          entries.map((entry) => {
            const MoodIcon = (entry.mood && moodIcons[entry.mood]) || FileText;
            const moodColor = entry.mood ? moodColors[entry.mood] : "text-muted-foreground/60 bg-muted/10 border-border/10";
            const confirmOpen = deleteDateConfirm === entry.date;

            return (
              <div key={entry.date} className="group relative">
                {/* Visual side timeline node */}
                <div className="absolute left-[-16px] top-7 w-[2px] h-full bg-border/20 group-last:h-0 hidden lg:block" />
                <div className="absolute left-[-22px] top-6 w-3.5 h-3.5 rounded-full border-2 border-background bg-border/40 group-hover:bg-primary transition-all duration-300 hidden lg:block" />

                <Card className="overflow-hidden border border-border/60 hover:border-border hover:shadow-md transition-all duration-300" interactive>
                  <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-4">
                    
                    {/* Left: Info */}
                    <div className="space-y-3 flex-grow min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center border shrink-0", moodColor)}>
                          <MoodIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`${ROUTES.APP.ENTRY(entry.date)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]} className="block">
                            <h3 className="font-serif font-black text-xl tracking-tight text-foreground hover:text-primary transition-colors truncate">
                              {entry.title ? (
                                <Highlight text={entry.title} query={debouncedSearch} />
                              ) : (
                                "Untitled Entry"
                              )}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60 uppercase mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <Highlight text={formatDate(entry.date)} query={debouncedSearch} />
                            </span>
                            <span>•</span>
                            <span>{entry.wordCount} words</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm font-serif text-muted-foreground leading-relaxed line-clamp-3">
                        {entry.contentText ? (
                          <Highlight
                            text={getSnippet(entry.contentText, debouncedSearch)}
                            query={debouncedSearch}
                          />
                        ) : (
                          "This entry is waiting for your next reflection."
                        )}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="shrink-0 self-start sm:self-center flex items-center gap-2 relative">
                      {confirmOpen ? (
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-right-2 duration-200">
                          <AlertCircle className="h-4 w-4 text-destructive ml-1 shrink-0" />
                          <span className="text-[10px] font-mono text-destructive uppercase tracking-wider font-semibold">Delete?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer rounded-lg text-xs font-bold"
                            onClick={() => handleDelete(entry.date)}
                            disabled={isDeleting}
                          >
                            Yes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:bg-muted cursor-pointer rounded-lg text-xs font-bold"
                            onClick={() => setDeleteDateConfirm(null)}
                            disabled={isDeleting}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          onClick={() => setDeleteDateConfirm(entry.date)}
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/10">
          <span className="text-xs font-mono text-muted-foreground/60 uppercase">
            Showing Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl gap-1 text-xs cursor-pointer"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl gap-1 text-xs cursor-pointer"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
