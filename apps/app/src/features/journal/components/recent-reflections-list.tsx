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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground py-10 text-center font-serif text-sm">
        No entries found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const MoodIcon = (entry.mood && moodIcons[entry.mood]) || FileText;
        const moodColor = entry.mood
          ? moodColors[entry.mood]
          : "text-muted-foreground/60 bg-muted/10 border-border/10";

        return (
          <Link
            key={entry.date}
            href={`${ROUTES.APP.ENTRY(entry.date)}?today=${today}` as Route}
            className="block"
          >
            <div className="hover:bg-muted/30 hover:border-border/5 flex items-center justify-between rounded-xl border border-transparent p-3 transition-colors">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${moodColor}`}
                >
                  <MoodIcon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-foreground truncate font-serif text-sm font-bold">
                    {entry.title || "Untitled Entry"}
                  </h4>
                  <span className="text-running-head text-muted-foreground/60">
                    {formatDisplayDate(entry.date)}
                  </span>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground/40 h-4 w-4 shrink-0" />
            </div>
          </Link>
        );
      })}
      <div className="flex justify-end pt-2">
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
