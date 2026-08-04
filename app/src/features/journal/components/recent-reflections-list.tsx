"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Angry, Frown, Meh, Smile, SmilePlus, FileText } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { DecryptedEntry } from "../services/journal-service";
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/utils/date";

const moodIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: SmilePlus,
};

const moodColors: Record<number, string> = {
  1: "text-red-500 bg-red-500/10 border-red-500/20",
  2: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  3: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  4: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  5: "text-teal-500 bg-teal-500/10 border-teal-500/20",
};

interface RecentReflectionsListProps {
  initialEntries: DecryptedEntry[];
  today: string;
}

export function RecentReflectionsList({ initialEntries, today }: RecentReflectionsListProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [entries, setEntries] = useState<DecryptedEntry[]>(initialEntries);

  useEffect(() => {
    const decryptEntries = async () => {
      if (isClientEncrypted && masterKey) {
        const decrypted = [];
        for (const entry of initialEntries) {
          const title = await safeDecryptText(entry.title || "", masterKey);
          decrypted.push({
            ...entry,
            title: title || "Untitled Entry",
          });
        }
        setEntries(decrypted);
      } else {
        setEntries(initialEntries);
      }
    };
    decryptEntries();
  }, [initialEntries, isClientEncrypted, masterKey]);

  if (entries.length === 0) {
    return (
      <div className="text-sm font-serif text-muted-foreground text-center py-10">
        No entries found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const MoodIcon = (entry.mood && moodIcons[entry.mood]) || FileText;
        const moodColor = entry.mood ? moodColors[entry.mood] : "text-muted-foreground/60 bg-muted/10 border-border/10";

        return (
          <Link
            key={entry.date}
            href={`${ROUTES.APP.ENTRY(entry.date)}?today=${today}` as Route}
            className="block"
          >
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${moodColor}`}>
                  <MoodIcon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-serif font-bold text-sm text-foreground truncate">
                    {entry.title || "Untitled Entry"}
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                    {formatDisplayDate(entry.date)}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </div>
          </Link>
        );
      })}
      <div className="pt-2 flex justify-end">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 p-0 hover:bg-transparent"
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
