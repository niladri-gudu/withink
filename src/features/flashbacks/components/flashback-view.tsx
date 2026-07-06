"use client";

import { useState, useTransition, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { 
  MailOpen, 
  Reply, 
  ArrowLeft, 
  Type, 
  RefreshCw, 
  BookOpen,
  Angry,
  Frown,
  Meh,
  Smile,
  SmilePlus
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { refreshFlashbackAction } from "../actions/flashback-actions";
import type { DecryptedEntry } from "../../journal/services/journal-service";
import { cn } from "@/lib/utils";

const moodIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: SmilePlus,
};

const moodLabels: Record<number, string> = {
  1: "Angry",
  2: "Sad",
  3: "Neutral",
  4: "Happy",
  5: "Radiant",
};

const moodColors: Record<number, string> = {
  1: "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 border-red-500/20",
  2: "text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20",
  3: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/20",
  4: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
  5: "text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20",
};

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateString;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getPreview(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "This memory is quiet, but it is still yours to revisit.";
  return clean.length > 420 ? `${clean.slice(0, 420)}…` : clean;
}

interface FlashbackViewProps {
  initialEntry: DecryptedEntry | null;
  initialLabel: string;
  localToday: string;
}

export function FlashbackView({ initialEntry, initialLabel, localToday }: FlashbackViewProps) {
  const [entry, setEntry] = useState<DecryptedEntry | null>(initialEntry);
  const [label, setLabel] = useState<string>(initialLabel);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await refreshFlashbackAction(localToday);
      if (result.success && result.data) {
        setEntry(result.data.entry);
        setLabel(result.data.label);
      } else {
        // Fallback or empty state if no other flashback available
        setEntry(null);
        setLabel("");
      }
    });
  };

  if (!entry) {
    return (
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-10 space-y-6 w-full animate-in fade-in duration-300">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
              Memory Resurfacing • Flashbacks
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none text-foreground">
              Past{" "}
              <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
                flashbacks.
              </span>
            </h1>
            <p className="text-body-small text-muted-foreground mt-1">Reconnect with your past reflections</p>
          </div>
          <Button asChild variant="ghost" className="rounded-full gap-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider">
            <Link href={ROUTES.APP.DASHBOARD}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          </Button>
        </header>

        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/20 text-muted-foreground border border-border/10">
              <MailOpen className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-primary/60 block">
                Flashback
              </span>
              <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">
                No memories from the past yet
              </h2>
              <p className="text-body-small text-muted-foreground leading-relaxed">
                Once you write entries and let them settle, Withink will float historical memories back to you here.
              </p>
            </div>
            <Button asChild className="rounded-full px-6 cursor-pointer shadow-sm">
              <Link href={`${ROUTES.APP.ENTRY(localToday)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                <Reply className="mr-2 h-4 w-4" />
                Write Today
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const MoodIcon = (entry.mood && moodIcons[entry.mood]) || null;
  const moodColorClass = entry.mood ? moodColors[entry.mood] : "text-muted-foreground/60 bg-muted/10 border-border/10";
  const moodText = entry.mood ? moodLabels[entry.mood] : "Unmooded";

  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      {/* Unified Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
            Memory Resurfacing • {label || "Flashback"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none text-foreground">
            Past{" "}
            <span className="text-primary italic font-light text-4xl sm:text-5xl pl-1">
              flashbacks.
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            Written on {formatDate(entry.date)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            onClick={handleRefresh} 
            disabled={isPending} 
            variant="outline" 
            className="rounded-full gap-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider hover:bg-muted/10 h-10 px-4 shrink-0 animate-in fade-in duration-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
            <span>Show another</span>
          </Button>

          <Button asChild variant="ghost" className="rounded-full gap-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider hover:bg-muted/10 h-10 px-4 shrink-0">
            <Link href={ROUTES.APP.DASHBOARD}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </header>

      <Card
        aria-busy={isPending}
        aria-live="polite"
        className={cn(
          "border border-border bg-card/75 backdrop-blur-md shadow-xl transition-all duration-300 w-full rounded-2xl",
          isPending && "opacity-60 scale-[0.99] blur-[1px]"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Mood</span>
            <div className={cn("flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold font-sans", moodColorClass)}>
              {MoodIcon && <MoodIcon className="h-3.5 w-3.5 mr-1" />}
              {moodText}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/70 font-mono">
            <Type className="h-3.5 w-3.5" />
            <span>{entry.wordCount} words</span>
          </div>
        </CardHeader>

        <CardContent className="pt-8 px-6 sm:px-10 pb-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground uppercase">
            {entry.title || "Untitled Memory"}
          </h2>
          <p className="text-base sm:text-lg font-serif text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
            &ldquo;{getPreview(entry.contentText)}&rdquo;
          </p>

          <div className="pt-6 flex flex-col sm:flex-row gap-3 border-t border-border/10">
            <Button asChild className="h-12 flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-bold gap-2">
              <Link href={`${ROUTES.APP.ENTRY(localToday)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                <Reply className="h-4 w-4" />
                <span>Reflect & Respond</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 rounded-full border-border bg-transparent hover:bg-muted/10 cursor-pointer font-bold gap-2 text-foreground">
              <Link href={`${ROUTES.APP.ENTRY(entry.date)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                <BookOpen className="h-4 w-4" />
                <span>Re-read Full Entry</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[10px] font-mono text-muted-foreground/60 py-4">
        Withink resurfaces one memory at a time so reflection stays gentle.
      </p>
    </div>
  );
}
