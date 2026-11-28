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
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { safeDecryptText } from "@/lib/crypto-client";
import { safeStorage } from "@/lib/safe-storage";
import { useEncryption } from "@/providers/encryption-provider";

import type { DecryptedEntry } from "../services/journal-service";

/** One warm first-entry nudge; dismissal is per-device and permanent. */
const PROMPT_DISMISS_KEY = "withink-first-entry-prompt-dismissed";

interface TodayReflectionCardProps {
  entry: DecryptedEntry | null;
  today: string;
  /** Entry fields are already plaintext (local-first path); skip decrypting. */
  plaintext?: boolean;
}

export function TodayReflectionCard({
  entry,
  today,
  plaintext = false,
}: TodayReflectionCardProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedTitle, setDecryptedTitle] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptedHtml, setDecryptedHtml] = useState<string | null>(null);

  // Resolved post-mount so the server HTML and hydration agree (storage is a
  // client-only signal). While unresolved we show the prompt, matching SSR.
  const [promptDismissed, setPromptDismissed] = useState(false);
  useEffect(() => {
    const dismissed = safeStorage.getItem(PROMPT_DISMISS_KEY) === "true";
    if (dismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage signal, intentionally set after mount
      setPromptDismissed(true);
    }
  }, []);

  const dismissPrompt = () => {
    safeStorage.setItem(PROMPT_DISMISS_KEY, "true");
    setPromptDismissed(true);
  };

  useEffect(() => {
    const decrypt = async () => {
      if (!entry) return;
      // Local-first: fields already came from the decrypted IndexedDB cache.
      if (plaintext) {
        setDecryptedTitle(entry.title || "Untitled Reflection");
        setDecryptedText(entry.contentText || "");
        setDecryptedHtml(entry.contentHtml || "");
        return;
      }
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
  }, [entry, plaintext, isClientEncrypted, masterKey]);

  if (!entry) {
    return (
      <Card className="border-border relative flex flex-col overflow-hidden border md:col-span-2">
        <div className="from-accent/60 via-accent/25 absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r to-transparent" />
        <CardHeader>
          <span className="text-running-head text-accent">
            Today&apos;s page
          </span>
          <CardTitle className="text-foreground font-serif text-2xl font-bold">
            A page waiting to be written
          </CardTitle>
          <CardDescription>
            Begin writing your reflection for today
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-6 pt-2">
          {promptDismissed ? (
            <p className="text-muted-foreground font-serif text-sm leading-relaxed">
              Take a brief moment to sit back, breathe, and write about how your
              day is going. Reflections keep your mind clear and your memories
              alive.
            </p>
          ) : (
            <div className="border-border/60 bg-muted/20 relative rounded-[0.75rem] border px-4 py-3.5">
              <button
                type="button"
                onClick={dismissPrompt}
                aria-label="Dismiss writing prompt"
                className="text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring absolute top-2 right-2 cursor-pointer rounded-full p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <p className="text-foreground/80 pr-6 font-serif text-base leading-relaxed italic">
                What made today feel like today?
              </p>
              <p className="text-caption text-muted-foreground mt-2 flex items-center gap-1.5">
                <ShieldCheck
                  className="text-accent/70 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Saves as you write — private, and only yours.
              </p>
            </div>
          )}

          {/* The blank page: faint ruled lines waiting for ink */}
          <div className="space-y-3 pt-2" aria-hidden="true">
            <div className="border-border/80 border-t" />
            <div className="border-border/50 border-t" />
            <div className="border-border/30 border-t" />
          </div>

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
      <CardHeader className="border-border/60 border-b pb-4">
        <span className="text-running-head text-accent mb-1">
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
            <div className="border-border/60 flex justify-end border-t pt-4">
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
