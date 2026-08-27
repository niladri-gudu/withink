"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import { Card, CardContent } from "@withink/ui/card";
import { IconButton } from "@withink/ui/icon-button";
import { Skeleton } from "@withink/ui/skeleton";
import { cn } from "@withink/utils";
import {
  Angry,
  Calendar,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  FileText,
  FolderInput,
  Frown,
  Loader2,
  Meh,
  Smile,
  SmilePlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { formatDisplayDate } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MoveEntryDialog } from "@/features/notebooks/components/move-entry-dialog";

import {
  deleteEntryAction,
  getEntriesListAction,
} from "../actions/entry-actions";
import {
  diaryCacheService,
  filterLocalTimeline,
} from "../services/diary-cache-service";
import type { DecryptedEntry } from "../services/journal-service";
import { journalSyncService } from "../services/journal-sync-service";
import type { TimeFilter } from "./entries-controls";

interface EntriesTimelineProps {
  initialEntries: DecryptedEntry[];
  initialTotal: number;
  localToday: string;
  /** Server-derived: whether this account uses client-side encryption. */
  accountEncrypted: boolean;
  /** Page-level filter state (owned by EntriesPageShell). */
  debouncedSearch: string;
  moodFilter: string;
  timeFilter: TimeFilter;
  /** "all" or a notebook id (owned by EntriesPageShell). */
  notebookFilter: string;
  /** The viewer's notebooks for meta-row labels (only when > 1). */
  notebooks: { id: string; name: string }[];
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
  accountEncrypted,
  debouncedSearch,
  moodFilter,
  timeFilter,
  notebookFilter,
  notebooks,
  onEntryDeleted,
}: EntriesTimelineProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { isClientEncrypted, masterKey } = useEncryption();

  // Any page-level filter change restarts pagination from the first page.
  // (Render-time adjustment per the React docs — no cascading effect.)
  const [prevFilters, setPrevFilters] = useState({
    search: debouncedSearch,
    moodFilter,
    timeFilter,
    notebookFilter,
  });
  if (
    prevFilters.search !== debouncedSearch ||
    prevFilters.moodFilter !== moodFilter ||
    prevFilters.timeFilter !== timeFilter ||
    prevFilters.notebookFilter !== notebookFilter
  ) {
    setPrevFilters({
      search: debouncedSearch,
      moodFilter,
      timeFilter,
      notebookFilter,
    });
    setPage(1);
  }

  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

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
      syncScheduledRef.current = false;
      const now = Date.now();
      if (now - syncRanAtRef.current < 5 * 60 * 1000) return;
      syncRanAtRef.current = now;
      void runSync();
    };

    if (syncScheduledRef.current) return;
    syncScheduledRef.current = true;
    let idleId = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => schedule(), { timeout: 3000 });
    } else {
      timerId = setTimeout(schedule, 2000);
    }
    return () => {
      if ("cancelIdleCallback" in window && idleId) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) clearTimeout(timerId);
      syncScheduledRef.current = false;
    };
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
        notebookFilter,
        localToday,
        isClientEncrypted,
        isUnlocked: !!masterKey,
      },
    ],
    queryFn: async () => {
      if (isClientEncrypted && masterKey) {
        // Fetch and decrypt metadata directly from browser cache (no network overhead!)
        const cached = await diaryCacheService.getLocalCacheTimeline(masterKey);

        // Filter against the FULL decrypted text so search matches words
        // anywhere in an entry, not just the 240-char preview snippet, plus
        // human-readable date forms ("Jul 1", "July 4, 2026").
        const filtered = filterLocalTimeline(cached, {
          moodFilter: moodFilter === "all" ? "all" : Number(moodFilter),
          timeFilter,
          search: debouncedSearch,
          notebookFilter,
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
        notebookId: notebookFilter !== "all" ? notebookFilter : undefined,
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
        timeFilter === "all" &&
        notebookFilter === "all";
      // Only trust the server-provided page when the account does NOT use
      // client-side encryption — otherwise these are ciphertext blobs, not
      // displayable titles.
      if (isDefaultState && !accountEncrypted) {
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

  // ZK accounts have no displayable server page: until the local decrypted
  // cache resolves, show skeletons instead of an (incorrect) empty state.
  const awaitingLocalCache = accountEncrypted && !data;

  const deleteMutation = useMutation({
    mutationFn: (date: string) => deleteEntryAction(date),
    onSuccess: async (res, date) => {
      if (res.success) {
        if (isClientEncrypted) {
          await diaryCacheService.deleteLocalMetadata(date);
        }
        toast.success(`Entry for ${formatDisplayDate(date)} deleted.`);
        setDeleteDate(null);
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

  const deletingEntry =
    deleteMutation.isPending && deleteMutation.variables
      ? deleteMutation.variables
      : null;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
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

        {awaitingLocalCache ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/60 border">
                <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:p-8">
                  <div className="flex w-full flex-grow space-y-3">
                    <div className="flex w-full items-center gap-3">
                      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                      <div className="w-full max-w-xs space-y-2">
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : entries.length === 0 ? (
          notebookFilter !== "all" && !debouncedSearch ? (
            // Scoped empty state: this notebook simply has no pages yet.
            <Card className="border-border/80 flex flex-col items-center justify-center border py-16 text-center">
              <span className="border-border/40 bg-secondary/40 text-muted-foreground mb-4 flex h-14 w-14 items-center justify-center rounded-full border">
                <FileText className="h-6 w-6" />
              </span>
              <p className="text-serif text-foreground mb-1 text-lg font-semibold">
                This notebook is waiting for its first page
              </p>
              <p className="text-body-small text-muted-foreground max-w-sm">
                {notebooks.find((n) => n.id === notebookFilter)?.name ??
                  "This notebook"}{" "}
                has no entries yet. Today is a fine day to start it.
              </p>
              <Button asChild className="mt-6">
                <Link
                  href={
                    `${ROUTES.APP.ENTRY(localToday)}?today=${localToday}&notebook=${notebookFilter}` as unknown as ComponentPropsWithoutRef<
                      typeof Link
                    >["href"]
                  }
                >
                  Write today&apos;s entry
                </Link>
              </Button>
            </Card>
          ) : (
            <Card className="border-border/80 flex flex-col items-center justify-center border py-16 text-center">
              <span className="border-border/40 bg-secondary/40 text-muted-foreground mb-4 flex h-14 w-14 items-center justify-center rounded-full border">
                <FileText className="h-6 w-6" />
              </span>
              <p className="text-serif text-foreground mb-1 text-lg font-semibold">
                No matching reflections
              </p>
              <p className="text-body-small text-muted-foreground max-w-sm">
                Adjust your search query or filters to find older journal logs,
                or write a new entry.
              </p>
            </Card>
          )
        ) : (
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => {
              const MoodIcon =
                (entry.mood && moodIcons[entry.mood]) || FileText;
              const moodColor = entry.mood
                ? moodColors[entry.mood]
                : "text-muted-foreground/60 bg-muted/10 border-border/10";

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
                    <CardContent className="flex flex-row items-start justify-between gap-2 p-5 sm:gap-6 sm:p-8">
                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                              moodColor,
                            )}
                          >
                            <MoodIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={
                                `${ROUTES.APP.ENTRY(entry.date)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<
                                  typeof Link
                                >["href"]
                              }
                              className="block"
                            >
                              <h3 className="text-foreground hover:text-primary truncate font-serif text-lg font-semibold tracking-tight transition-colors sm:text-xl">
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
                            {/* Meta row: date · words · notebook · mood — always visible */}
                            <div className="text-running-head text-muted-foreground/60 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <Highlight
                                  text={formatDisplayDate(entry.date)}
                                  query={debouncedSearch}
                                />
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{entry.wordCount} words</span>
                              {notebooks.length > 1 &&
                                notebookFilter === "all" &&
                                entry.notebookId && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="max-w-[10rem] truncate">
                                      {notebooks.find(
                                        (n) => n.id === entry.notebookId,
                                      )?.name ?? "Notebook"}
                                    </span>
                                  </>
                                )}
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

                      {/* Actions: visible icons → confirm Dialog (the one
                          app-wide destructive convention; no hover-reveal).
                          Move appears when the shelf has >1 notebook. */}
                      {notebooks.length > 1 && (
                        <IconButton
                          variant="ghost"
                          aria-label={`Move entry on ${formatDisplayDate(entry.date)} to another notebook`}
                          title="Move to notebook"
                          className="text-muted-foreground/70 hover:text-accent shrink-0"
                          onClick={() => setMoveDate(entry.date)}
                        >
                          <FolderInput className="h-4 w-4" />
                        </IconButton>
                      )}
                      <IconButton
                        variant="ghost"
                        aria-label={`Options for entry on ${formatDisplayDate(entry.date)}`}
                        title="Entry options"
                        className="text-muted-foreground/70 hover:text-destructive shrink-0"
                        onClick={() => setDeleteDate(entry.date)}
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </IconButton>
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
          <span className="text-running-head text-muted-foreground/60">
            Showing Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              className="h-10 cursor-pointer gap-1 rounded-xl text-xs sm:h-9"
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
              className="h-10 cursor-pointer gap-1 rounded-xl text-xs sm:h-9"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation — one convention for every destructive action */}
      <ConfirmDialog
        open={deleteDate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDate(null);
        }}
        title="Delete this reflection?"
        description={
          <>
            The entry written for{" "}
            <span className="text-foreground font-semibold">
              {deleteDate ? formatDisplayDate(deleteDate) : ""}
            </span>{" "}
            will be permanently erased. This cannot be undone.
          </>
        }
        pending={deletingEntry !== null}
        onConfirm={() => {
          if (deleteDate) void handleDelete(deleteDate);
        }}
      />

      {/* Move-to-notebook (shared dialog). ZK accounts pull right after so
          the local metadata cache learns the new filing. */}
      <MoveEntryDialog
        open={moveDate !== null}
        onOpenChange={(open) => {
          if (!open) setMoveDate(null);
        }}
        date={moveDate ?? ""}
        notebooks={notebooks}
        currentNotebookId={entries.find((e) => e.date === moveDate)?.notebookId}
        onMoved={() => {
          if (isClientEncrypted && masterKey) {
            void journalSyncService.requestSync(masterKey);
          }
        }}
      />
    </div>
  );
}
