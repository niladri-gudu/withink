/* eslint-disable react-hooks/purity */
"use client";
import { useMemo, useState } from "react";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import { EntryPreview } from "@/components/journal/entry-preview";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Entry {
  date: string;
  title: string;
  wordCount: number;
  preview: string;
  contentHtml: string;
}

interface Props {
  today: string;
  todayHtml: string;
  todayTitle: string;
  entries: Entry[];
  userName: string;
}

export function JournalHome({ today, entries, userName }: Props) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const todayEntry = useMemo(
    () => entries.find((e) => e.date === today),
    [entries, today],
  );

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const isTodaySelected = selectedEntry?.date === today;
  const showStartWriting = !todayEntry && isTodaySelected;
  const showDashboard = selectedEntry === null;

  const handleSelect = (entry: Entry | null) => {
    setSelectedEntry(entry);
    setIsMobileSidebarOpen(false);
  };

  const prompts = [
    "What's one thing you're grateful for today?",
    "Describe a small win from the last 24 hours.",
    "What's been on your mind lately?",
    "If today was a movie, what would the title be?",
  ];

  const randomPrompt = useMemo(
    () => prompts[Math.floor(Math.random() * prompts.length)],
    [],
  );

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 h-[calc(100vh-6rem)]">
          {/* Mobile overlay */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={cn(
              "flex-col overflow-hidden transition-all duration-300",
              "fixed inset-y-0 left-0 z-50 w-80 lg:relative lg:z-auto lg:inset-auto",
              isMobileSidebarOpen
                ? "flex translate-x-0"
                : "-translate-x-full lg:translate-x-0",
              isDesktopSidebarOpen ? "lg:flex lg:w-80" : "lg:hidden lg:w-0",
            )}
          >
            <div className="lg:hidden flex justify-end p-4 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-hidden">
              <JournalSidebar
                entries={entries}
                selectedDate={selectedEntry?.date ?? null}
                userName={userName}
                today={today}
                onSelect={handleSelect}
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDesktopSidebarOpen((o) => !o)}
                className="hidden lg:flex p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                {isDesktopSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>

              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden flex p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            {/* Preview panel */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 lg:px-4">
              {showDashboard ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="bg-primary/5 p-8 rounded-full mb-6">
                    <LayoutDashboard className="h-10 w-10 text-primary opacity-40" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black tracking-tight">
                    Hey, {userName}
                  </h2>
                  <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
                    Ready to reflect? Select a past entry or start something new
                    for today.
                  </p>
                </div>
              ) : showStartWriting ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto">
                  <div className="space-y-3">
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
                      Today is a fresh start.
                    </h2>
                    <p className="text-muted-foreground text-lg italic">
                      &quot;{randomPrompt}&quot;
                    </p>
                  </div>
                  <Link href={`/journal/${today}`}>
                    <Button
                      size="lg"
                      className="rounded-full px-10 h-14 text-base font-bold shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                      <PenLine className="mr-2 h-5 w-5" />
                      Start writing
                    </Button>
                  </Link>
                </div>
              ) : (
                <EntryPreview
                  date={selectedEntry.date}
                  title={selectedEntry.title}
                  contentHtml={selectedEntry.contentHtml}
                  wordCount={selectedEntry.wordCount}
                  today={today}
                  onDeleteSuccess={() => setSelectedEntry(null)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
