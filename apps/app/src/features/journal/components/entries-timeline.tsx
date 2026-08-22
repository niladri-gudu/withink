"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import { Card, CardContent } from "@withink/ui/card";
import { cn } from "@withink/utils";
import {
  AlertCircle,
  Angry,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Frown,
  Loader2,
  Meh,
  Search,
  Smile,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { formatDisplayDate } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import {
  deleteEntryAction,
  getEntriesListAction,
} from "../actions/entry-actions";
import type { DecryptedEntry } from "../services/journal-service";
import { diaryCacheService, filterLocalTimeline } from "../services/diary-cache-service";

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

function getSnippet(
  text: string,
  query: string,
  maxLength: number = 180,
): string {
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
          <mark
            key={i}
            className="bg-accent/20 text-foreground rounded px-0.5 font-medium"
          >
            {part}
          </mark>
        ) : (
          part
        ),
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

  const [deleteDateConfirm, setDeleteDateConfirm] = useState<string | null>(
    null,
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

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

  // Background Cache Sync Hook
  // Deferred to idle time (requestIdleCallback with a timeout fallback) so it
  // never competes with the page's first paint / search, throttled to at most
  // once per 5 minutes per session, and only runs for encrypted (ZK) users.
  const syncRanAtRef = useRef(0);
  const syncScheduledRef = useRef(false);
  useEffect(() => {
    if (!isClientEncrypted || !masterKey) return;

    const runSync = async () => {
      setIsSyncing(true);
      // Throttle progress updates to ~2/sec so background cache sync doesn't
      // re-render the whole (animated) timeline list on every completed chunk.
      let lastUpdate = 0;
      try {
        await diaryCacheService.syncDiaryCache(
          masterKey,
          localToday,
          (curr, tot) => {
            const now = Date.now();
            if (now - lastUpdate < 500 && curr < tot) return;
            lastUpdate = now;
            setSyncProgress({ current: curr, total: tot });
          },
        );
        // Invalidate query to trigger visual updates
        queryClient.invalidateQueries({ queryKey: ["entries"] });
      } catch (err) {
        console.error("Local cache sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    const schedule = () => {
      const now = Date.now();
      if (now - syncRanAtRef.current < 5 * 60 * 1000) {
        syncScheduledRef.current = false;
        return;
      }
      syncRanAtRef.current = now;
      syncScheduledRef.current = false;
      void runSync();
    };

    if (syncScheduledRef.current) return;
    syncScheduledRef.current = true;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => schedule(), { timeout: 3000 });
    } else {
      setTimeout(schedule, 2000);
    }
  }, [isClientEncrypted, masterKey, localToday, queryClient]);

  // Fetch updated page list using react-query (supporting fast local search for ZK mode)
  const { data, isFetching } = useQuery({
    queryKey: [
      "entries",
      {
        page,
        search: debouncedSearch,
        moodFilter,
        timeFilter,
        localToday,
        isClientEncrypted,
        isUnlocked: !!masterKey,
      },
    ],
    queryFn: async () => {
      if (isClientEncrypted && masterKey) {
        // Fetch and decrypt metadata directly from browser cache (no network overhead!)
        const cached =
          await diaryCacheService.getLocalCacheTimeline(masterKey);

        // Filter against the FULL decrypted text so search matches words
        // anywhere in an entry, not just the 240-char preview snippet, plus
        // human-readable date forms ("Jul 1", "July 4, 2026").
        const filtered = filterLocalTimeline(cached, {
          moodFilter: moodFilter === "all" ? "all" : Number(moodFilter),
          timeFilter,
          search: debouncedSearch,
          localToday,
        });

        // Paginate locally
        const startIndex = (page - 1) * LIMIT;
        const paginated = filtered.slice(startIndex, startIndex + LIMIT);

        return {
          entries: paginated.map((item) => ({
            ...item,
            id: item.date,
            userId: "",
            contentHtml: "",
            contentText: item.snippet,
            contentJson: {},
            createdAt: new Date(item.updatedAt),
            updatedAt: new Date(item.updatedAt),
          })) as unknown as DecryptedEntry[],
          total: filtered.length,
        };
      }

      // Default behavior for unencrypted users: remote search API call
      const res = await getEntriesListAction(page, LIMIT, {
        search: debouncedSearch || undefined,
        mood: moodFilter === "all" ? null : Number(moodFilter),
        timeFilter,
        today: localToday,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to fetch entries");
      }

      return res.data;
    },
    initialData: () => {
      const isDefaultState =
        page === 1 &&
        !debouncedSearch &&
        moodFilter === "all" &&
        timeFilter === "all";
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
    onSuccess: async (res, date) => {
      if (res.success) {
        if (isClientEncrypted) {
          await diaryCacheService.deleteLocalMetadata(date);
        }
        toast.success(`Entry for ${formatDisplayDate(date)} deleted.`);
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
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
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
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Search */}
        <div className="relative flex-grow">
          {isFetching ? (
            <Loader2 className="text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin" />
          ) : (
            <Search className="text-muted-foreground/60 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          )}
          <input
            type="text"
            placeholder="Search by title, contents, date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search entries"
            autoComplete="off"
            className="bg-card border-border placeholder:text-muted-foreground/50 focus-visible:ring-ring h-10 w-full rounded-xl border pr-4 pl-9 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {/* Time range */}
          <select
            value={timeFilter}
            onChange={(e) => {
              setTimeFilter(e.target.value as any); // eslint-disable-line @typescript-eslint/no-explicit-any
              setPage(1);
            }}
            aria-label="Filter by time range"
            className="bg-card border-border text-foreground focus-visible:ring-ring h-10 cursor-pointer rounded-xl border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
            className="bg-card border-border text-foreground focus-visible:ring-ring h-10 cursor-pointer rounded-xl border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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

      {/* Background Syncing Progress Indicator */}
      {isSyncing && syncProgress.total > 0 && (
        <div className="text-accent border-accent/15 bg-accent/5 flex animate-pulse items-center gap-2 rounded-xl border px-3 py-1.5 font-serif text-xs select-none">
          <Loader2 className="text-accent h-3.5 w-3.5 shrink-0 animate-spin" />
          <span>
            Syncing journal cache: {syncProgress.current} of{" "}
            {syncProgress.total} reflections...
          </span>
        </div>
      )}

      {/* Timeline entries list */}
      <div className="relative space-y-4">
        {/* Subtle top progress bar for background fetching */}
        <div className="bg-secondary/20 relative h-0.5 w-full overflow-hidden rounded-full">
          {isFetching && (
            <motion.div
              className="bg-primary/80 h-full rounded-full"
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
          <Card className="border-border/80 flex flex-col items-center justify-center border py-16 text-center">
            <span className="border-border/40 bg-secondary/40 text-muted-foreground mb-4 flex h-14 w-14 items-center justify-center rounded-full border">
              <FileText className="h-6 w-6" />
            </span>
            <p className="text-serif text-foreground mb-1 text-lg font-semibold">
              No matching reflections
            </p>
            <p className="text-body-small text-muted-foreground max-w-sm">
              Adjust your search query or filters to find older journal logs, or
              write a new entry.
            </p>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => {
              const MoodIcon =
                (entry.mood && moodIcons[entry.mood]) || FileText;
              const moodColor = entry.mood
                ? moodColors[entry.mood]
                : "text-muted-foreground/60 bg-muted/10 border-border/10";
              const confirmOpen = deleteDateConfirm === entry.date;

              return (
                <motion.div
                  key={entry.date}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="group relative"
                >
                  {/* Visual side timeline node */}
                  <div className="bg-border/20 absolute top-7 left-[-16px] hidden h-full w-[2px] group-last:h-0 lg:block" />
                  <div className="border-background bg-accent absolute top-6 left-[-22px] hidden h-3.5 w-3.5 rounded-full border-2 transition-all duration-300 lg:block" />

                  <Card
                    className="border-border/60 hover:border-border overflow-hidden border transition-all duration-300 hover:shadow-md"
                    interactive
                  >
                    <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:p-8">
                      {/* Left: Info */}
                      <div className="min-w-0 flex-grow space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                              moodColor,
                            )}
                          >
                            <MoodIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={
                                `${ROUTES.APP.ENTRY(entry.date)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<
                                  typeof Link
                                >["href"]
                              }
                              className="block"
                            >
                              <h3 className="text-foreground hover:text-primary truncate font-serif text-xl font-semibold tracking-tight transition-colors">
                                {entry.title ? (
                                  <Highlight
                                    text={entry.title}
                                    query={debouncedSearch}
                                  />
                                ) : (
                                  "Untitled Entry"
                                )}
                              </h3>
                            </Link>
                            <div className="text-muted-foreground/60 mt-0.5 flex items-center gap-2 font-serif text-[11px] tracking-[0.16em] uppercase">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <Highlight
                                  text={formatDisplayDate(entry.date)}
                                  query={debouncedSearch}
                                />
                              </span>
                              <span>•</span>
                              <span>{entry.wordCount} words</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-muted-foreground line-clamp-3 font-serif text-sm leading-relaxed">
                          {entry.contentText ? (
                            <Highlight
                              text={getSnippet(
                                entry.contentText,
                                debouncedSearch,
                              )}
                              query={debouncedSearch}
                            />
                          ) : (
                            "This entry is waiting for your next reflection."
                          )}
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="relative flex shrink-0 items-center gap-2 self-start sm:self-center">
                        {confirmOpen ? (
                          <div className="bg-destructive/10 border-destructive/20 animate-in slide-in-from-right-2 flex items-center gap-1.5 rounded-xl border p-1 duration-200">
                            <AlertCircle className="text-destructive ml-1 h-4 w-4 shrink-0" />
                            <span className="text-destructive font-serif text-[11px] font-semibold tracking-[0.16em] uppercase">
                              Delete?
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Confirm delete entry"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 cursor-pointer rounded-lg px-2 text-xs font-bold"
                              onClick={() => handleDelete(entry.date)}
                              disabled={isDeleting}
                            >
                              Yes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Cancel delete entry"
                              className="text-muted-foreground hover:bg-muted h-7 cursor-pointer rounded-lg px-2 text-xs font-bold"
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
                            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 h-9 w-9 shrink-0 cursor-pointer rounded-lg opacity-100 transition-colors group-hover:opacity-100 sm:opacity-0"
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
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="border-border/10 flex items-center justify-between border-t pt-4">
          <span className="text-muted-foreground/60 font-serif text-[11px] tracking-[0.12em] uppercase">
            Showing Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              className="h-9 cursor-pointer gap-1 rounded-xl text-xs"
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
              className="h-9 cursor-pointer gap-1 rounded-xl text-xs"
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
