"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";
import type { DecryptedEntry } from "../../journal/services/journal-service";

import type { ComponentPropsWithoutRef } from "react";

function formatDateShort(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface DashboardFlashbackCardProps {
  entry: DecryptedEntry | null;
  label: string;
  today: string;
}

export function DashboardFlashbackCard({ entry, label, today }: DashboardFlashbackCardProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedTitle, setDecryptedTitle] = React.useState<string | null>(null);
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
      <Card className="border border-border bg-card/60 backdrop-blur-sm" interactive>
        <CardHeader>
          <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-semibold">
            {label || "Flashback"}
          </span>
          <CardTitle className="text-lg font-serif font-semibold text-foreground">
            Anniversary Flashback
          </CardTitle>
          <CardDescription>
            Revisit a moment in time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-serif text-muted-foreground leading-relaxed italic">
            You haven&apos;t written any entries yet. Revisit this card tomorrow to see what you wrote in the past.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isDecrypting = decryptedTitle === null || decryptedText === null;
  const snippet = decryptedText
    ? (decryptedText.length > 220 ? decryptedText.substring(0, 220) + "..." : decryptedText)
    : "This entry is waiting for your next reflection.";

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm" interactive>
      <CardHeader>
        <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-semibold">
          {label || "Flashback"}
        </span>
        <CardTitle className="text-lg font-serif font-semibold text-foreground">
          {isDecrypting ? (
            <span className="inline-block w-32 h-4 bg-muted animate-pulse rounded" />
          ) : (
            decryptedTitle
          )}
        </CardTitle>
        <CardDescription>
          {formatDateShort(entry.date)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isDecrypting ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-serif text-muted-foreground leading-relaxed italic">
              {snippet}
            </p>
            <Button asChild variant="link" className="p-0 text-primary hover:text-primary/80 h-auto cursor-pointer text-xs font-bold font-mono uppercase tracking-widest gap-1">
              <Link href={`${ROUTES.APP.ENTRY(entry.date)}?today=${today}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
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
