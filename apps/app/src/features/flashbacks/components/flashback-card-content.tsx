"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@withink/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { safeDecryptText } from "@/lib/crypto-client";
import { formatDisplayDate } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import type { DecryptedEntry } from "../../journal/services/journal-service";

interface DashboardFlashbackCardProps {
  entry: DecryptedEntry | null;
  label: string;
  today: string;
}

export function DashboardFlashbackCard({
  entry,
  label,
  today,
}: DashboardFlashbackCardProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedTitle, setDecryptedTitle] = React.useState<string | null>(
    null,
  );
  const [decryptedText, setDecryptedText] = React.useState<string | null>(null);

  React.useEffect(() => {
    const decrypt = async () => {
      if (!entry) return;
      if (isClientEncrypted && masterKey) {
        const title = await safeDecryptText(entry.title || "", masterKey);
        const text = await safeDecryptText(entry.contentText || "", masterKey);
        setDecryptedTitle(title || "Untitled Reflection");
        setDecryptedText(text || "");
      } else {
        setDecryptedTitle(entry.title || "Untitled Reflection");
        setDecryptedText(entry.contentText || "");
      }
    };
    decrypt();
  }, [entry, isClientEncrypted, masterKey]);

  if (!entry) {
    return (
      <Card
        className="border-border bg-card/60 border backdrop-blur-sm"
        interactive
      >
        <CardHeader>
          <span className="text-accent font-serif text-[9px] font-semibold tracking-[0.15em] uppercase">
            {label || "Flashback"}
          </span>
          <CardTitle className="text-foreground font-serif text-lg font-semibold">
            Anniversary Flashback
          </CardTitle>
          <CardDescription>Revisit a moment in time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-serif text-sm leading-relaxed italic">
            You haven&apos;t written any entries yet. Revisit this card tomorrow
            to see what you wrote in the past.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isDecrypting = decryptedTitle === null || decryptedText === null;
  const snippet = decryptedText
    ? decryptedText.length > 220
      ? decryptedText.substring(0, 220) + "..."
      : decryptedText
    : "This entry is waiting for your next reflection.";

  return (
    <Card
      className="border-border bg-card/60 border backdrop-blur-sm"
      interactive
    >
      <CardHeader>
        <span className="text-accent font-serif text-[9px] font-semibold tracking-[0.15em] uppercase">
          {label || "Flashback"}
        </span>
        <CardTitle className="text-foreground font-serif text-lg font-semibold">
          {isDecrypting ? (
            <span className="bg-muted inline-block h-4 w-32 animate-pulse rounded" />
          ) : (
            decryptedTitle
          )}
        </CardTitle>
        <CardDescription>{formatDisplayDate(entry.date)}</CardDescription>
      </CardHeader>
      <CardContent>
        {isDecrypting ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground font-serif text-sm leading-relaxed italic">
              {snippet}
            </p>
            <Button
              asChild
              variant="link"
              className="text-accent hover:text-accent/80 h-auto cursor-pointer gap-1 p-0 font-serif text-xs font-bold tracking-[0.15em] uppercase"
            >
              <Link
                href={`${ROUTES.APP.ENTRY(entry.date)}?today=${today}` as Route}
              >
                Re-read Entry
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
