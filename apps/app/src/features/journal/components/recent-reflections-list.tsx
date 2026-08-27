"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Skeleton } from "@withink/ui/skeleton";
import {
  Angry,
  ArrowRight,
  FileText,
  Frown,
  Meh,
  Smile,
  SmilePlus,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { safeDecryptText } from "@/lib/crypto-client";
import { formatDisplayDate } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import type { DecryptedEntry } from "../services/journal-service";

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

interface RecentReflectionsListProps {
  initialEntries: DecryptedEntry[];
  today: string;
  /** Whether the account uses client-side encryption. Server-derived so the
   *  SSR HTML renders skeletons instead of ciphertext blobs for ZK users. */
  encrypted?: boolean;
}

export function RecentReflectionsList({
  initialEntries,
  today,
  encrypted = false,
}: RecentReflectionsListProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [entries, setEntries] = useState<DecryptedEntry[]>(initialEntries);
  const [ready, setReady] = useState(!encrypted);

  useEffect(() => {
    let cancelled = false;
    const decryptEntries = async () => {
      if (isClientEncrypted || encrypted) {
        if (!masterKey) {
          if (!cancelled) setReady(false);
          return;
        }
        const decrypted = [];
        for (const entry of initialEntries) {
          const title = await safeDecryptText(entry.title || "", masterKey);
          decrypted.push({
            ...entry,
            title: title || "Untitled Entry",
          });
        }
        if (cancelled) return;
        setEntries(decrypted);
        setReady(true);
      } else {
        if (cancelled) return;
        setEntries(initialEntries);
        setReady(true);
      }
    };
    decryptEntries();
    return () => {
      cancelled = true;
    };
  }, [initialEntries, isClientEncrypted, masterKey, encrypted]);

  if (!ready) {
    return (
      <div className="divide-border/60 divide-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="text-running-head h-3 w-5 shrink-0" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-2.5 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground/70 py-8 text-center font-serif text-sm italic">
        The index is empty — today&apos;s page starts it.
      </p>
    );
  }

  return (
    <div>
      {/* The codex index: ruled rows, shelf numerals, quiet mood markers */}
      <ul className="divide-border/60 divide-y">
        {entries.map((entry, index) => {
          const MoodIcon = (entry.mood && moodIcons[entry.mood]) || FileText;
          const moodColor = entry.mood
            ? moodColors[entry.mood]
            : "text-muted-foreground/60 bg-muted/10 border-border/10";

          return (
            <li key={entry.date}>
              <Link
                href={`${ROUTES.APP.ENTRY(entry.date)}?today=${today}` as Route}
                className="group hover:bg-secondary/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="text-running-head text-muted-foreground/50 w-5 shrink-0"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${moodColor}`}
                >
                  <MoodIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-foreground group-hover:text-accent block truncate font-serif text-sm font-semibold transition-colors">
                    {entry.title || "Untitled Entry"}
                  </span>
                  <span className="text-running-head text-muted-foreground/60">
                    {formatDisplayDate(entry.date)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-border/60 mt-1 flex justify-end border-t pt-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 p-0 font-serif text-xs tracking-[0.16em] uppercase hover:bg-transparent"
        >
          <Link href={ROUTES.APP.ENTRIES}>
            View Archive
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
