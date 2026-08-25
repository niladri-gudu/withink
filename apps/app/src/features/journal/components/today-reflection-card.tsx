"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@withink/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { safeDecryptText } from "@/lib/crypto-client";
import { useEncryption } from "@/providers/encryption-provider";

import type { DecryptedEntry } from "../services/journal-service";

interface TodayReflectionCardProps {
  entry: DecryptedEntry | null;
  today: string;
}

export function TodayReflectionCard({
  entry,
  today,
}: TodayReflectionCardProps) {
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
      <Card className="border-border relative flex flex-col overflow-hidden border md:col-span-2">
        <div className="from-accent/60 via-accent/25 absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r to-transparent" />
        <CardHeader>
          <span className="text-accent font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
            Today&apos;s page
          </span>
          <CardTitle className="text-foreground font-serif text-2xl font-bold">
            A page waiting to be written
          </CardTitle>
          <CardDescription>
            Begin writing your reflection for today
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between space-y-6 pt-2">
          <p className="text-muted-foreground font-serif text-sm leading-relaxed">
            Take a brief moment to sit back, breathe, and write about how your
            day is going. Reflections keep your mind clear and your memories
            alive.
          </p>
          <Button asChild className="h-11 w-full cursor-pointer sm:w-fit">
            <Link
              href={
                `${ROUTES.APP.ENTRY(today)}?today=${today}` as unknown as ComponentPropsWithoutRef<
                  typeof Link
                >["href"]
              }
            >
              Write today&apos;s entry
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isDecrypting =
    decryptedTitle === null || decryptedText === null || decryptedHtml === null;

  return (
    <Card className="border-border relative flex flex-col overflow-hidden border md:col-span-2">
      <div className="from-accent/60 via-accent/25 absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r to-transparent" />
      <div className="animate-in fade-in zoom-in absolute top-0 right-0 p-4 duration-300">
        <CheckCircle2 className="text-accent h-6 w-6" />
      </div>
      <CardHeader className="border-border/10 border-b pb-4">
        <span className="text-accent mb-1 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
          Today&apos;s page
        </span>
        <CardTitle className="text-foreground font-serif text-2xl font-bold">
          {isDecrypting ? (
            <span className="bg-muted/40 inline-block h-5 w-40 animate-pulse rounded" />
          ) : (
            decryptedTitle || "Untitled Reflection"
          )}
        </CardTitle>
        <CardDescription>
          Your entry for today is secure in your diary
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between space-y-6 pt-6">
        {isDecrypting ? (
          <div className="flex justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative">
              {decryptedText ? (
                <p className="text-foreground/90 font-serif text-sm leading-relaxed">
                  {(() => {
                    const cleaned = decryptedText.replace(/\s+/g, " ").trim();
                    return cleaned.length > 180
                      ? cleaned.substring(0, 180) + "..."
                      : cleaned;
                  })()}
                </p>
              ) : (
                <p className="text-muted-foreground/60 font-serif text-sm leading-relaxed italic">
                  This entry is empty. Click edit to write your thoughts.
                </p>
              )}
            </div>
            <div className="border-border/10 flex justify-end border-t pt-4">
              <Button
                asChild
                className="h-11 w-full cursor-pointer px-6 sm:w-fit"
              >
                <Link
                  href={
                    `${ROUTES.APP.ENTRY(today)}?today=${today}` as unknown as ComponentPropsWithoutRef<
                      typeof Link
                    >["href"]
                  }
                >
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
