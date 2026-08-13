"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ComponentPropsWithoutRef,
} from "react";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Card, CardContent, CardHeader } from "@withink/ui/card";
import { cn } from "@withink/utils";
import {
  Angry,
  ArrowLeft,
  Frown,
  MailOpen,
  Meh,
  RefreshCw,
  Reply,
  Smile,
  SmilePlus,
  Type,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/features/app-shell/components/page-header";
import { safeDecryptText } from "@/lib/crypto-client";
import { formatDisplayDate } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import type { DecryptedEntry } from "../../journal/services/journal-service";
import { refreshFlashbackAction } from "../actions/flashback-actions";

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

export function FlashbackView({
  initialEntry,
  initialLabel,
  localToday,
}: FlashbackViewProps) {
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
        const decText = await safeDecryptText(
          entry.contentText || "",
          masterKey,
        );
        const decHtml = await safeDecryptText(
          entry.contentHtml || "",
          masterKey,
        );
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
      <div className="animate-in fade-in w-full space-y-6 duration-300">
        <PageHeader
          runningHead="Flashbacks"
          note="memories find their way back"
          title="Past"
          accent="flashbacks."
          description="Reconnect with your past reflections"
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

        <Card className="border-border border">
          <CardContent className="flex flex-col items-center justify-center space-y-6 py-20 text-center">
            <div className="bg-muted/20 text-muted-foreground border-border/10 mx-auto flex h-16 w-16 items-center justify-center rounded-xl border">
              <MailOpen className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-2">
              <span className="text-accent/70 block font-serif text-[11px] font-bold tracking-[0.16em] uppercase">
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
      {/* Unified Page Header */}
      <PageHeader
        runningHead="Flashbacks"
        note={label ? `this date, one year past — ${label}` : "this date, one year past"}
        title="Past"
        accent="flashbacks."
        description={`Written on ${formatDisplayDate(entry.date, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`}
        action={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={handleRefresh}
              disabled={isPending}
              variant="outline"
              className="hover:bg-muted/10 animate-in fade-in h-10 shrink-0 cursor-pointer gap-1.5 px-4 font-serif text-xs tracking-[0.16em] uppercase duration-300"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
              />
              <span>Show another</span>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="hover:bg-muted/10 h-10 shrink-0 cursor-pointer gap-1.5 px-4 font-serif text-xs tracking-[0.16em] uppercase"
            >
              <Link href={ROUTES.APP.DASHBOARD}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </Link>
            </Button>
          </div>
        }
      />

      <Card
        aria-busy={isPending}
        aria-live="polite"
        className={cn(
          "border-border w-full rounded-xl border shadow-sm transition-all duration-300",
          isPending && "scale-[0.99] opacity-60 blur-[1px]",
        )}
      >
        <CardHeader className="border-border/10 flex flex-row items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60 font-serif text-[11px] tracking-[0.15em] uppercase">
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

        <CardContent className="space-y-6 px-6 pt-8 pb-10 sm:px-10">
          <h2 className="text-foreground border-border/10 border-b pb-3 font-serif text-2xl font-bold tracking-tight uppercase sm:text-3xl">
            {decryptedTitle || "Untitled Memory"}
          </h2>

          <div className="relative pt-2">
            {decryptedHtml ? (
              <div
                className="prose prose-stone dark:prose-invert text-foreground/90 max-w-none font-serif leading-relaxed"
                dangerouslySetInnerHTML={{ __html: decryptedHtml }}
              />
            ) : decryptedText ? (
              <div className="text-foreground/90 font-serif text-base leading-relaxed whitespace-pre-wrap sm:text-lg">
                {decryptedText}
              </div>
            ) : (
              <p className="text-muted-foreground/60 font-serif text-base leading-relaxed italic sm:text-lg">
                This memory is quiet, but it is still yours to revisit.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground/60 py-4 text-center font-hand text-xl">
        Withink resurfaces one memory at a time so reflection stays gentle.
      </p>
    </div>
  );
}
