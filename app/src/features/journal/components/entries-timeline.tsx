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
import { motion } from "motion/react";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEntriesListAction, deleteEntryAction } from "../actions/entry-actions";
import type { DecryptedEntry } from "../services/journal-service";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";

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
  1: "text-mood-1 bg-mood-1-bg border-mood-1-border",
  2: "text-mood-2 bg-mood-2-bg border-mood-2-border",
  3: "text-mood-3 bg-mood-3-bg border-mood-3-border",
  4: "text-mood-4 bg-mood-4-bg border-mood-4-border",
  5: "text-mood-5 bg-mood-5-bg border-mood-5-border",
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
    return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
  }
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
  }

  if (index < maxLength / 3) {
    return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
  }

  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);

  let snippet = text.substring(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";

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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { isClientEncrypted, masterKey } = useEncryption();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month">("all");
  
  const [deleteDateConfirm, setDeleteDateConfirm] = useState<string | null>(null);

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

  // Fetch updated page list using react-query
  const { data, isFetching } = useQuery({
    queryKey: ["entries", { page, search: debouncedSearch, moodFilter, timeFilter, localToday, isClientEncrypted, isUnlocked: !!masterKey }],
    queryFn: async () => {
      const limit = (isClientEncrypted && debouncedSearch) ? 5000 : LIMIT;
      const res = await getEntriesListAction((isClientEncrypted && debouncedSearch) ? 1 : page, limit, {
        search: isClientEncrypted ? undefined : (debouncedSearch || undefined),
        mood: moodFilter === "all" ? null : Number(moodFilter),
        timeFilter,
        today: localToday,
      });
      if (!res.success || !res.data) {
        console.error("Failed to load entries:", res.error);
        throw new Error(res.error || "Failed to fetch entries");
      }

      let rawEntries = res.data.entries;
      const total = res.data.total;

      // Decrypt client-side if encrypted
      if (isClientEncrypted && masterKey) {
        const decrypted = [];
        for (const entry of rawEntries) {
          const title = await safeDecryptText(entry.title, masterKey);
          const contentHtml = await safeDecryptText(entry.contentHtml, masterKey);
          const contentText = await safeDecryptText(entry.contentText, masterKey);
          
          let contentJson = entry.contentJson;
          if (typeof entry.contentJson === "string") {
            const decJson = await safeDecryptText(entry.contentJson, masterKey);
            try {
              contentJson = JSON.parse(decJson);
            } catch {
              contentJson = {};
            }
          }
          decrypted.push({ ...entry, title, contentHtml, contentText, contentJson });
        }
        rawEntries = decrypted;
      }

      // If client-encrypted and search query is present, filter locally!
      if (isClientEncrypted && debouncedSearch) {
        const queryLower = debouncedSearch.trim().toLowerCase();
        const filtered = rawEntries.filter((entry) => {
          if (entry.title?.toLowerCase().includes(queryLower)) return true;
          if (entry.contentText?.toLowerCase().includes(queryLower)) return true;
          if (entry.date?.includes(queryLower)) return true;
          return false;
        });
        
        // Paginate local results
        const startIndex = (page - 1) * LIMIT;
        const paginated = filtered.slice(startIndex, startIndex + LIMIT);
        return {
          entries: paginated,
          total: filtered.length,
        };
      }

      return {
        entries: rawEntries,
        total,
      };
    },
    initialData: () => {
      const isDefaultState = page === 1 && !debouncedSearch && moodFilter === "all" && timeFilter === "all";
      if (isDefaultState && !isClientEncrypted) {
        return {
          entries: initialEntries,
          total: initialTotal,
        };
      }
      return undefined;
    },
    placeholderData: keepPreviousData,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (date: string) => deleteEntryAction(date),
    onSuccess: (res, date) => {
      if (res.success) {
        toast.success(`Entry for ${formatDate(date)} deleted.`);
        setDeleteDateConfirm(null);
        onEntryDeleted?.();
        
        // Adjust page if we deleted the last item on this page
        if (entries.length === 1 && page > 1) {
          setPage((p) => p - 1);
        }
        
        queryClient.invalidateQueries({ queryKey: ["entries"] });
      } else {
        toast.error(res.error || "Failed to delete entry.");
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    },
  });

  const handleDelete = async (date: string) => {
    deleteMutation.mutate(date);
  };

  const isDeleting = deleteMutation.isPending;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow">
          {isFetching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          )}
          <input
            type="text"
            placeholder="Search by title, contents, date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search entries"
            autoComplete="off"
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            aria-label="Filter by time range"
            className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            aria-label="Filter by mood"
            className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        {/* Subtle top progress bar for background fetching */}
        <div className="h-0.5 w-full bg-secondary/20 rounded-full overflow-hidden relative">
          {isFetching && (
            <motion.div
              className="h-full bg-primary/80 rounded-full"
              initial={{ x: "-100%", width: "40%" }}
              animate={{ x: "250%" }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: "easeInOut",
              }}
            />
          )}
        </div>

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
              <motion.div
                key={entry.date}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="group relative"
              >
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
                            <h3 className="font-serif font-semibold text-xl tracking-tight text-foreground hover:text-primary transition-colors truncate">
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
                            aria-label="Confirm delete entry"
                            className="h-7 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer rounded-lg text-xs font-bold"
                            onClick={() => handleDelete(entry.date)}
                            disabled={isDeleting}
                          >
                            Yes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Cancel delete entry"
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
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
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
              aria-label="Previous page"
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
              aria-label="Next page"
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
