"use client";

import { useMemo, useState } from "react";
import { JournalSidebar } from "@/components/journal-sidebar";
import { EntryPreview } from "@/components/entry-preview";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, PenLine } from "lucide-react";

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
  const todayEntry = useMemo(
    () => entries.find((e) => e.date === today),
    [entries, today],
  );

  // Default to null to show the Dashboard on landing
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const isTodaySelected = selectedEntry?.date === today;
  const showStartWriting = !todayEntry && isTodaySelected;

  // Dashboard is visible if nothing is selected
  const showDashboard = selectedEntry === null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
          <aside className="w-80 shrink-0 border border-border rounded-[2rem] overflow-hidden flex flex-col bg-card/50">
            <JournalSidebar
              entries={entries}
              // Pass null if the dashboard is active
              selectedDate={selectedEntry?.date ?? null}
              userName={userName}
              today={today}
              // Adding a special handler for "Dashboard" click in sidebar
              onSelect={setSelectedEntry}
              onClose={() => {}}
            />
          </aside>

          <div className="flex-1 border border-border rounded-[2rem] overflow-hidden bg-card/50 flex flex-col">
            <div className="flex-1 overflow-y-auto p-10">
              {showDashboard ? (
                /* 1. DASHBOARD VIEW (Blank for now) */
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="bg-primary/5 p-6 rounded-full mb-4">
                    <LayoutDashboard className="h-12 w-12 text-primary opacity-20" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Welcome back, {userName}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Select an entry or start a new one to begin.
                  </p>
                </div>
              ) : showStartWriting ? (
                /* 2. START WRITING STATE */
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                      No entry for today
                    </h2>
                    <p className="text-muted-foreground max-w-[280px]">
                      You haven&apos;t written anything for today yet. Capture
                      your thoughts before the day ends!
                    </p>
                  </div>
                  <Link href={`/journal/${today}`}>
                    <Button
                      size="lg"
                      className="rounded-full px-8 shadow-xl shadow-primary/20"
                    >
                      <PenLine className="mr-2 h-5 w-5" />
                      Start writing
                    </Button>
                  </Link>
                </div>
              ) : (
                /* 3. VIEW ENTRY STATE */
                <EntryPreview
                  date={selectedEntry.date}
                  title={selectedEntry.title}
                  contentHtml={selectedEntry.contentHtml}
                  wordCount={selectedEntry.wordCount}
                  today={today}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
