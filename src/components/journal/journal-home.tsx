/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/purity */
"use client";
import { useEffect, useMemo, useState } from "react";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import { EntryPreview } from "@/components/journal/entry-preview";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  X,
  Search,
  History,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StreakCounter } from "./streak-counter";
import { DigitalClock } from "./clock";
import { getRandomEntry } from "@/actions/flashback";
import Link from "next/link";
import { MoodHeatmap } from "@/components/journal/mood-heatmap";
import { addDays, getLocalDateString } from "@/lib/utils/date";
import { useRouter } from "next/navigation";

interface Entry {
  date: string;
  title: string;
  wordCount: number;
  mood: number | null;
  preview: string;
  contentHtml: string;
}

interface Props {
  today: string;
  todayHtml: string;
  todayTitle: string;
  entries: Entry[];
  userName: string;
  streak: number;
  totalEntries: number;
  totalWords: number;
}

export function JournalHome({
  today,
  entries: serverEntries,
  userName,
  streak,
  totalEntries,
  totalWords,
}: Props) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isFetchingEntry, setIsFetchingEntry] = useState(false);
  const [entryCache, setEntryCache] = useState<Record<string, Entry>>({});
  const [localToday, setLocalToday] = useState(today);

  useEffect(() => {
    const currentLocalToday = getLocalDateString();
    document.cookie = `withink-local-date=${currentLocalToday}; path=/; max-age=34560000; samesite=lax`;
    const syncTimer = window.setTimeout(() => {
      setLocalToday(currentLocalToday);
    }, 0);

    if (currentLocalToday !== today) {
      router.refresh();
    }

    return () => window.clearTimeout(syncTimer);
  }, [router, today]);

  const entries = useMemo(() => {
    const map = new Map<string, Entry>();
    serverEntries.forEach((e) => map.set(e.date, e));
    return Array.from(map.values());
  }, [serverEntries]);

  const yesterdayDate = useMemo(() => {
    return addDays(localToday, -1);
  }, [localToday]);

  const yesterdayEntry = useMemo(
    () => entries.find((e) => e.date === yesterdayDate),
    [entries, yesterdayDate],
  );

  const isExistingEntry = useMemo(() => {
    if (!selectedEntry) return false;

    return selectedEntry.wordCount > 0 || !!selectedEntry.contentHtml;
  }, [selectedEntry]);

  const isWithinGracePeriod = useMemo(() => {
    if (!selectedEntry) return false;
    return selectedEntry.date === localToday || selectedEntry.date === yesterdayDate;
  }, [localToday, selectedEntry, yesterdayDate]);

  const showDashboard = selectedEntry === null;
  const showEntryPreview = isExistingEntry && selectedEntry !== null;
  const showStartWriting =
    !isExistingEntry && isWithinGracePeriod && selectedEntry !== null;
  const showLockedState = useMemo(() => {
    return (
      !isExistingEntry &&
      !isWithinGracePeriod &&
      selectedEntry !== null &&
      !isFetchingEntry
    );
  }, [isExistingEntry, isWithinGracePeriod, selectedEntry, isFetchingEntry]);

  const handleSelect = async (entry: Entry | null) => {
    setIsMobileSidebarOpen(false);
    if (!entry) {
      setSelectedEntry(null);
      return;
    }
    if (entryCache[entry.date]) {
      setSelectedEntry(entryCache[entry.date]);
      return;
    }
    if (!entry.contentHtml && entry.wordCount > 0) {
      setIsFetchingEntry(true);
      try {
        const params = new URLSearchParams({
          date: entry.date,
          today: localToday,
        });
        const res = await fetch(`/api/entries?${params.toString()}`);
        const data = await res.json();
        if (data.entry) {
          setEntryCache((prev) => ({ ...prev, [entry.date]: data.entry }));
          setSelectedEntry(data.entry);
        } else {
          setSelectedEntry(entry);
        }
      } catch (err) {
        toast.error("Protocol error.");
        setSelectedEntry(entry);
      } finally {
        setIsFetchingEntry(false);
      }
    } else {
      setSelectedEntry(entry);
    }
  };

  const handleDeleteSuccess = () => {
    if (selectedEntry) {
      const deletedDate = selectedEntry.date;
      const newCache = { ...entryCache };
      delete newCache[deletedDate];
      setEntryCache(newCache);
      toast.success("Archive purged.");
      if (deletedDate === localToday) {
        setSelectedEntry({
          date: localToday,
          title: "",
          wordCount: 0,
          mood: null,
          preview: "",
          contentHtml: "",
        });
      } else {
        setSelectedEntry(null);
      }
    }
  };

  const userLocalToday = localToday;
  const randomPrompt = useMemo(
    () =>
      [
        "What was your biggest win today?",
        "What made you truly grateful?",
        "What's been on your mind lately?",
        "If today was a movie, what's its title?",
      ][Math.floor(Math.random() * 4)],
    [],
  );

  return (
    <div className="h-dvh bg-background text-foreground overflow-hidden flex flex-col">
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 lg:py-6 pt-19 lg:pt-22 overflow-hidden">
        <div className="flex gap-3 lg:gap-6 h-full">
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}
          <aside
            className={cn(
              "flex flex-col overflow-hidden transition-all duration-300 fixed inset-x-0 top-16 bottom-0 z-50 w-[min(92vw,360px)] lg:relative lg:top-0 lg:z-auto lg:inset-auto",
              isMobileSidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0",
              isDesktopSidebarOpen ? "lg:flex lg:w-80" : "lg:hidden lg:w-0",
            )}
          >
            <div className="flex-1 overflow-hidden">
              <JournalSidebar
                entries={entries}
                selectedDate={selectedEntry?.date ?? null}
                userName={userName}
                today={localToday}
                onSelect={handleSelect}
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between gap-3 shrink-0 mb-3 lg:mb-4">
              <button
                onClick={() => setIsDesktopSidebarOpen((o) => !o)}
                className="hidden lg:flex p-2 rounded-xl text-muted-foreground hover:bg-muted/50 transition-all"
              >
                {isDesktopSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/60 text-foreground border border-border/30 shadow-sm transition-all active:scale-95"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="lg:hidden flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/50 truncate">
                  {showDashboard ? "Dashboard" : selectedEntry?.title || "Entry"}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-0.5 lg:px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
              {isFetchingEntry ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : showDashboard ? (
                <div className="min-h-full flex flex-col space-y-6 sm:space-y-10 lg:space-y-12">
                  <div className="flex items-center justify-between py-3 sm:py-5 lg:py-8 border-b border-border/40">
                    <StreakCounter
                      currentStreak={streak}
                      totalEntries={totalEntries}
                    />
                    <div className="hidden md:flex">
                      <DigitalClock />
                    </div>
                  </div>

                  <MoodHeatmap entries={entries} today={localToday} />

                  {!yesterdayEntry && (
                    <div className="w-full">
                      <Link
                        href={`/journal/${yesterdayDate}?today=${userLocalToday}`}
                      >
                        <Button
                          variant="ghost"
                          className="w-full bg-primary/5 border border-primary/10 rounded-4xl py-8 px-4 sm:px-8 h-auto flex flex-col items-center gap-4 hover:bg-primary/8 transition-all group overflow-hidden"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 text-primary max-w-full">
                            <History className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold truncate">
                              Yesterday remains unwritten
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm italic text-muted-foreground/60 px-2 text-center text-balance max-w-md">
                            The system allows a 24-hour grace period. Would you
                            like to finalize this entry?
                          </p>

                          <div className="flex items-center gap-2 text-primary/40 group-hover:text-primary transition-colors">
                            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest">
                              Initialize.Session
                            </span>
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-2 transition-transform" />
                          </div>
                        </Button>
                      </Link>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 lg:gap-4 mt-1 lg:mt-8 px-0 md:px-0">
                    <div className="p-4 sm:p-5 lg:p-8 rounded-3xl lg:rounded-4xl bg-muted/20 border border-border/40 opacity-60">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 mb-3 sm:mb-4 opacity-20" />
                      <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.22em] sm:tracking-[0.3em] opacity-30">
                        Archive.Search
                      </p>
                      <p className="text-xs sm:text-sm mt-1 italic opacity-40 leading-tight">
                        Indexing pending...
                      </p>
                    </div>
                    <div
                      onClick={async () => {
                        setIsFetchingEntry(true);
                        const random = await getRandomEntry();
                        if (random) handleSelect(random);
                        setIsFetchingEntry(false);
                      }}
                      className="p-4 sm:p-5 lg:p-8 rounded-3xl lg:rounded-4xl bg-muted/20 border border-border/40 hover:bg-muted/50 hover:border-primary/20 transition-all cursor-pointer group active:scale-95"
                    >
                      <History className="h-4 w-4 sm:h-5 sm:w-5 mb-3 sm:mb-4 opacity-40 group-hover:text-primary transition-colors" />
                      <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.22em] sm:tracking-[0.3em] opacity-30">
                        Archive.Flashback
                      </p>
                      <p className="text-xs sm:text-sm mt-1 italic opacity-60 leading-tight">
                        Retrieve random log...
                      </p>
                    </div>
                    <div className="p-4 sm:p-5 lg:p-8 rounded-3xl lg:rounded-4xl bg-muted/20 border border-border/40">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 mb-3 sm:mb-4 text-yellow-500/60" />
                      <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.22em] sm:tracking-[0.3em] opacity-30">
                        System.Analysis
                      </p>
                      <p className="text-xs sm:text-sm font-bold opacity-60">
                        {totalWords.toLocaleString()} words
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center mt-4 lg:mt-12 pb-12 sm:pb-16">
                    <div className="max-w-xs space-y-4">
                      <p className="text-xs sm:text-sm italic text-muted-foreground/40 leading-relaxed px-4 sm:px-6">
                        &quot;{randomPrompt}&quot;
                      </p>
                      <div className="opacity-10 pointer-events-none hidden sm:flex items-center justify-center gap-4">
                        <div className="h-px w-8 lg:w-12 bg-foreground" />
                        <p className="text-[8px] lg:text-[10px] font-mono uppercase tracking-[1em] ml-[1em]">
                          Encrypted
                        </p>
                        <div className="h-px w-8 lg:w-12 bg-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : showLockedState ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
                  <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center border border-border/50 opacity-20">
                    <X className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black uppercase tracking-widest opacity-40">
                      Vault Locked
                    </h2>
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
                      Historical creation protocol disabled.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedEntry(null)}
                    className="rounded-full px-8 opacity-60 hover:bg-muted"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              ) : showStartWriting ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                    Today is a fresh start.
                  </h2>
                  <p className="text-sm lg:text-base italic text-muted-foreground/60 leading-relaxed px-4">
                    &quot;{randomPrompt}&quot;
                  </p>{" "}
                  <Link
                    href={`/journal/${selectedEntry?.date}?today=${userLocalToday}`}
                  >
                    <Button
                      size="lg"
                      className="rounded-full px-10 h-16 text-base font-bold shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                      <PenLine className="mr-2 h-5 w-5" /> Start writing
                    </Button>
                  </Link>
                </div>
              ) : (
                <EntryPreview
                  date={selectedEntry!.date}
                  title={selectedEntry!.title}
                  contentHtml={selectedEntry!.contentHtml}
                  wordCount={selectedEntry!.wordCount}
                  mood={selectedEntry!.mood}
                  today={localToday}
                  onDeleteSuccess={handleDeleteSuccess}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
