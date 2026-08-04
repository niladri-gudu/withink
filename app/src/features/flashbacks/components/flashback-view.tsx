"use client";

import { useState, useTransition, useEffect, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { 
  MailOpen, 
  Reply, 
  ArrowLeft, 
  Type, 
  RefreshCw, 
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
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";
import { formatDisplayDate } from "@/lib/utils/date";

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
  1: "text-mood-1 bg-mood-1-bg border-mood-1-border",
  2: "text-mood-2 bg-mood-2-bg border-mood-2-border",
  3: "text-mood-3 bg-mood-3-bg border-mood-3-border",
  4: "text-mood-4 bg-mood-4-bg border-mood-4-border",
  5: "text-mood-5 bg-mood-5-bg border-mood-5-border",
};

interface FlashbackViewProps {
  initialEntry: DecryptedEntry | null;
  initialLabel: string;
  localToday: string;
}

export function FlashbackView({ initialEntry, initialLabel, localToday }: FlashbackViewProps) {
  const [entry, setEntry] = useState<DecryptedEntry | null>(initialEntry);
  const [label, setLabel] = useState<string>(initialLabel);
  const [isPending, startTransition] = useTransition();

  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedTitle, setDecryptedTitle] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [decryptedHtml, setDecryptedHtml] = useState("");

  useEffect(() => {
    const decryptFields = async () => {
      if (!entry) return;
      if (isClientEncrypted && masterKey) {
        const decTitle = await safeDecryptText(entry.title || "", masterKey);
        const decText = await safeDecryptText(entry.contentText || "", masterKey);
        const decHtml = await safeDecryptText(entry.contentHtml || "", masterKey);
        setDecryptedTitle(decTitle || "Untitled Memory");
        setDecryptedText(decText);
        setDecryptedHtml(decHtml || "");
      } else {
        setDecryptedTitle(entry.title || "Untitled Memory");
        setDecryptedText(entry.contentText || "");
        setDecryptedHtml(entry.contentHtml || "");
      }
    };
    decryptFields();
  }, [entry, isClientEncrypted, masterKey]);

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
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">
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
              <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground">
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
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">
            Past{" "}
            <span className="text-primary italic font-light text-4xl sm:text-5xl pl-1">
              flashbacks.
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            Written on {formatDisplayDate(entry.date, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
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

        <CardContent className="pt-8 px-6 sm:px-10 pb-10 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground uppercase border-b border-border/10 pb-3">
            {decryptedTitle || "Untitled Memory"}
          </h2>
          
          <div className="relative pt-2">
            {decryptedHtml ? (
              <div 
                className="prose prose-stone dark:prose-invert max-w-none text-foreground/90 font-serif leading-relaxed"
                dangerouslySetInnerHTML={{ __html: decryptedHtml }}
              />
            ) : decryptedText ? (
              <div className="text-base sm:text-lg font-serif text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {decryptedText}
              </div>
            ) : (
              <p className="text-base sm:text-lg font-serif text-muted-foreground/60 leading-relaxed italic">
                This memory is quiet, but it is still yours to revisit.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[10px] font-mono text-muted-foreground/60 py-4">
        Withink resurfaces one memory at a time so reflection stays gentle.
      </p>
    </div>
  );
}
