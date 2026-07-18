"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";
import type { DecryptedEntry } from "../services/journal-service";

interface TodayReflectionCardProps {
  entry: DecryptedEntry | null;
  today: string;
}

export function TodayReflectionCard({ entry, today }: TodayReflectionCardProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedTitle, setDecryptedTitle] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptedHtml, setDecryptedHtml] = useState<string | null>(null);

  useEffect(() => {
    const decrypt = async () => {
      if (!entry) return;
      if (isClientEncrypted && masterKey) {
        const title = await safeDecryptText(entry.title || "", masterKey);
        const text = await safeDecryptText(entry.contentText || "", masterKey);
        const html = await safeDecryptText(entry.contentHtml || "", masterKey);
        setDecryptedTitle(title || "Untitled Reflection");
        setDecryptedText(text || "");
        setDecryptedHtml(html || "");
      } else {
        setDecryptedTitle(entry.title || "Untitled Reflection");
        setDecryptedText(entry.contentText || "");
        setDecryptedHtml(entry.contentHtml || "");
      }
    };
    decrypt();
  }, [entry, isClientEncrypted, masterKey]);

  if (!entry) {
    return (
      <Card className="md:col-span-2 flex flex-col border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-serif font-semibold text-foreground">
            Today&apos;s Reflection
          </CardTitle>
          <CardDescription>
            Begin writing your reflection for today
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between pt-2 space-y-6">
          <p className="text-sm font-serif text-muted-foreground leading-relaxed">
            Take a brief moment to sit back, breathe, and write about how your day is going. Reflections keep your mind clear and your memories alive.
          </p>
          <Button asChild className="w-fit cursor-pointer rounded-full shadow-sm">
            <Link href={`${ROUTES.APP.ENTRY(today)}?today=${today}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
              Write Reflection
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isDecrypting = decryptedTitle === null || decryptedText === null || decryptedHtml === null;

  return (
    <Card className="md:col-span-2 flex flex-col border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="h-6 w-6 text-primary" />
      </div>
      <CardHeader className="border-b border-border/10 pb-4">
        <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold block mb-1">
          Today&apos;s Reflection
        </span>
        <CardTitle className="text-2xl font-serif font-bold text-foreground">
          {isDecrypting ? (
            <span className="inline-block w-40 h-5 bg-muted/40 animate-pulse rounded" />
          ) : (
            decryptedTitle || "Untitled Reflection"
          )}
        </CardTitle>
        <CardDescription>
          Your entry for today is secure in your sanctuary
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pt-6 space-y-6">
        {isDecrypting ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="relative">
              {decryptedText ? (
                <p className="text-sm font-serif text-foreground/90 leading-relaxed">
                  {(() => {
                    const cleaned = decryptedText.replace(/\s+/g, " ").trim();
                    return cleaned.length > 180
                      ? cleaned.substring(0, 180) + "..."
                      : cleaned;
                  })()}
                </p>
              ) : (
                <p className="text-sm font-serif text-muted-foreground/60 leading-relaxed italic">
                  This entry is empty. Click edit to write your thoughts.
                </p>
              )}
            </div>
            <div className="pt-4 border-t border-border/10 flex justify-end">
              <Button asChild className="rounded-full px-6 cursor-pointer shadow-sm">
                <Link href={`${ROUTES.APP.ENTRY(today)}?today=${today}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                  Edit Entry
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
