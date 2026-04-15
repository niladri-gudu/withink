"use client";

import { useMemo, useState } from "react";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import { EntryPreview } from "@/components/journal/entry-preview";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, PenLine, X } from "lucide-react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const todayEntry = useMemo(
    () => entries.find((e) => e.date === today),
    [entries, today],
  );

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const isTodaySelected = selectedEntry?.date === today;
  const showStartWriting = !todayEntry && isTodaySelected;
  const showDashboard = selectedEntry === null;

  // Helper to handle selection and close sidebar on mobile
  const handleSelect = (entry: Entry | null) => {
    setSelectedEntry(entry);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 lg:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        
        {/* Mobile Header Toggle - Simplified and borderless */}
        <div className="lg:hidden flex items-center justify-between mb-8 px-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-bold tracking-tight">Journal</span>
          <div className="w-10" />
        </div>

        <div className="flex gap-12 h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)] relative">
          
          {/* Sidebar Overlay for Mobile */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar Container - Removed borders and card styling */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-50 w-80 bg-background lg:bg-transparent overflow-hidden flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="lg:hidden flex justify-end p-6">
               <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSidebarOpen(false)}>
                 <X className="h-6 w-6" />
               </Button>
            </div>
            
            <JournalSidebar
              entries={entries}
              selectedDate={selectedEntry?.date ?? null}
              userName={userName}
              today={today}
              onSelect={handleSelect}
              onClose={() => setIsSidebarOpen(false)}
            />
          </aside>

          {/* Preview Panel Container - Borderless and background-free */}
          <div className="flex-1 overflow-hidden flex flex-col w-full">
            <div className="flex-1 overflow-y-auto px-2 lg:px-4">
              {showDashboard ? (
                /* 1. DASHBOARD VIEW */
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                   <div className="bg-primary/5 p-8 rounded-full mb-6">
                     <LayoutDashboard className="h-10 w-10 text-primary opacity-40" />
                   </div>
                   <h2 className="text-2xl lg:text-3xl font-black tracking-tight">
                     Hey, {userName}
                   </h2>
                   <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
                     Ready to reflect? Select a past entry or start something new for today.
                   </p>
                </div>
              ) : showStartWriting ? (
                /* 2. START WRITING STATE */
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto">
                  <div className="space-y-3">
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
                      Empty page.
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      You haven&apos;t written anything for today yet. Don&apos;t let the day slip away.
                    </p>
                  </div>
                  <Link href={`/journal/${today}`}>
                    <Button size="lg" className="rounded-full px-10 h-14 text-base font-bold shadow-2xl shadow-primary/20 hover:scale-105 transition-transform">
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