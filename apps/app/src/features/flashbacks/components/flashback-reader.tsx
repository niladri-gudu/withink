"use client";

import type { ComponentPropsWithoutRef, ComponentType } from "react";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Card, CardContent, CardHeader } from "@withink/ui/card";
import { Skeleton } from "@withink/ui/skeleton";
import { cn } from "@withink/utils";
import {
  Angry,
  ArrowLeft,
  Frown,
  History,
  MailOpen,
  Meh,
  RefreshCw,
  Reply,
  Smile,
  SmilePlus,
  Type,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { formatDisplayDate } from "@/lib/utils/date";
import { PageHeader } from "@/features/app-shell/components/page-header";

const moodIcons: Record<number, ComponentType<{ className?: string }>> = {
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
  1: "text-mood-1 bg-mood-1-bg border-mood-1-border",
  2: "text-mood-2 bg-mood-2-bg border-mood-2-border",
  3: "text-mood-3 bg-mood-3-bg border-mood-3-border",
  4: "text-mood-4 bg-mood-4-bg border-mood-4-border",
  5: "text-mood-5 bg-mood-5-bg border-mood-5-border",
};

/** A decrypted (or local plaintext) entry, ready to render. */
export interface FlashbackDisplayEntry {
  date: string;
  title: string;
  contentText: string;
  contentHtml: string;
  mood: number | null;
  wordCount: number;
}

interface FlashbackReaderProps {
  entry: FlashbackDisplayEntry | null;
  label: string;
  localToday: string;
  /** Shown while the local timeline / document is still resolving. */
  loading?: boolean;
  /** Omitted when there is no "another memory" source (e.g. local, no data). */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Friendly copy for a failed load; renders a retry instead of the empty state. */
  error?: string | null;
  /** Retry the failed load (shown only with `error` and `onRetry`). */
  onRetry?: () => void;
}

/**
 * Presentational flashback reader shared by the server-entry path
 * (`FlashbackView`) and the local-first path (`FlashbackViewLocal`). Owns the
 * empty state, the memory card, and the refresh affordance; the caller owns
 * where the memory comes from.
 */
export function FlashbackReader({
  entry,
  label,
  localToday,
  loading = false,
  onRefresh,
  isRefreshing = false,
  error = null,
  onRetry,
}: FlashbackReaderProps) {
  if (loading) {
    return (
      <div className="animate-in fade-in w-full space-y-8 duration-300">
        <PageHeader
          runningHead="Flashbacks"
          note="memories find their way back"
          title="Past"
          accent="flashbacks."
          today={localToday}
        />
        <Card className="border-border border p-6">
          <div className="space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="animate-in fade-in w-full space-y-6 duration-300">
        <PageHeader
          runningHead="Flashbacks"
          note="memories find their way back"
          title="Past"
          accent="flashbacks."
          description="Reconnect with your past reflections"
          today={localToday}
          action={
            <Button
              asChild
              variant="ghost"
              className="cursor-pointer gap-1.5 font-serif text-xs tracking-[0.16em] uppercase"
            >
              <Link href={ROUTES.APP.DASHBOARD}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
            </Button>
          }
        />

        {error ? (
          <Card className="border-border border" role="alert">
            <CardContent className="flex flex-col items-center justify-center space-y-6 py-20 text-center">
              <div className="bg-muted/20 text-muted-foreground border-border/10 mx-auto flex h-16 w-16 items-center justify-center rounded-xl border">
                <History className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-2">
                <span className="text-running-head text-accent/70 block">
                  Flashback
                </span>
                <h2 className="text-foreground font-serif text-2xl font-bold tracking-tight">
                  This memory slipped out of reach
                </h2>
                <p className="text-body-small text-muted-foreground leading-relaxed">
                  {error}
                </p>
              </div>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRefreshing}
                  variant="outline"
                  className="h-11 cursor-pointer gap-1.5 px-6"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                  />
                  Try again
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border border">
            <CardContent className="flex flex-col items-center justify-center space-y-6 py-20 text-center">
              <div className="bg-muted/20 text-muted-foreground border-border/10 mx-auto flex h-16 w-16 items-center justify-center rounded-xl border">
                <MailOpen className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-2">
                <span className="text-running-head text-accent/70 block">
                  Flashback
                </span>
                <h2 className="text-foreground font-serif text-2xl font-bold tracking-tight">
                  No memories from the past yet
                </h2>
                <p className="text-body-small text-muted-foreground leading-relaxed">
                  Once you write entries and let them settle, Withink will float
                  historical memories back to you here.
                </p>
              </div>
              <Button asChild className="cursor-pointer px-6">
                <Link
                  href={
                    `${ROUTES.APP.ENTRY(localToday)}?today=${localToday}` as unknown as ComponentPropsWithoutRef<
                      typeof Link
                    >["href"]
                  }
                >
                  <Reply className="mr-2 h-4 w-4" />
                  Write Today
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const MoodIcon = (entry.mood && moodIcons[entry.mood]) || null;
  const moodColorClass = entry.mood
    ? moodColors[entry.mood]
    : "text-muted-foreground/60 bg-muted/10 border-border/10";
  const moodText = entry.mood ? moodLabels[entry.mood] : "Unmooded";

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      <PageHeader
        runningHead="Flashbacks"
        note={
          label
            ? `this date, one year past — ${label}`
            : "this date, one year past"
        }
        title="Past"
        accent="flashbacks."
        today={localToday}
        description={`Written on ${formatDisplayDate(entry.date, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {onRefresh && (
              <Button
                onClick={onRefresh}
                disabled={isRefreshing}
                variant="outline"
                className="hover:bg-muted/10 animate-in fade-in h-11 shrink-0 cursor-pointer gap-1.5 px-3.5 font-serif text-xs tracking-[0.16em] uppercase duration-300 sm:h-10 sm:px-4"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                />
                <span>Show another</span>
              </Button>
            )}

            <Button
              asChild
              variant="ghost"
              className="hover:bg-muted/10 h-11 shrink-0 cursor-pointer gap-1.5 px-3.5 font-serif text-xs tracking-[0.16em] uppercase sm:h-10 sm:px-4"
            >
              <Link href={ROUTES.APP.DASHBOARD}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>
            </Button>
          </div>
        }
      />

      <Card
        aria-busy={isRefreshing}
        aria-live="polite"
        className={cn(
          "border-border w-full rounded-[0.75rem] border transition-[opacity,scale,filter] duration-300",
          isRefreshing && "scale-[0.99] opacity-60 blur-[1px]",
        )}
      >
        <CardHeader className="border-border/10 flex flex-row items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="text-running-head text-muted-foreground/60">
              Mood
            </span>
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 font-serif text-xs font-bold",
                moodColorClass,
              )}
            >
              {MoodIcon && <MoodIcon className="mr-1 h-3.5 w-3.5" />}
              {moodText}
            </div>
          </div>
          <div className="text-muted-foreground/70 flex items-center gap-1.5 font-serif text-xs font-semibold">
            <Type className="h-3.5 w-3.5" />
            <span>{entry.wordCount} words</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-5 pt-7 pb-9 sm:px-10 sm:pt-8 sm:pb-10">
          <h2 className="text-foreground border-border/10 border-b pb-3 font-serif text-2xl font-bold tracking-tight uppercase sm:text-3xl">
            {entry.title || "Untitled Memory"}
          </h2>

          <div className="relative pt-2">
            {entry.contentHtml ? (
              <div
                className="prose prose-stone dark:prose-invert text-foreground/90 max-w-none font-serif leading-relaxed"
                dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
              />
            ) : entry.contentText ? (
              <div className="text-foreground/90 font-serif text-base leading-relaxed whitespace-pre-wrap sm:text-lg">
                {entry.contentText}
              </div>
            ) : (
              <p className="text-muted-foreground/60 font-serif text-base leading-relaxed italic sm:text-lg">
                This memory is quiet, but it is still yours to revisit.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground/60 font-hand py-4 text-center text-xl">
        Withink resurfaces one memory at a time so reflection stays gentle.
      </p>
    </div>
  );
}
