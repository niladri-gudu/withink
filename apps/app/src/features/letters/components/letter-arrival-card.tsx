"use client";
import { Mail } from "lucide-react";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatDisplayDate } from "@/lib/utils/date";
import { decryptText } from "@/lib/crypto-client";
import { useEncryption } from "@/providers/encryption-provider";
import type { LetterMetaRecord } from "@/features/letters/services/letter-service";

function looksCipher(value: unknown): value is string {
  return typeof value === "string" && value.includes(":");
}

/** The reflection sheet's gold edge — something here asks to be opened. */
function GoldEdge() {
  return (
    <div
      aria-hidden="true"
      className="from-accent/60 via-accent/25 absolute top-0 right-0 left-0 h-[2px] rounded-t-xl bg-gradient-to-r to-transparent"
    />
  );
}

/** The closed envelope — this letter waits to be read. */
function EnvelopeDisc() {
  return (
    <span className="border-accent/40 bg-accent/10 text-accent flex size-9 shrink-0 items-center justify-center rounded-full border">
      <Mail className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

/**
 * The one quiet envelope on the Today page: "a letter arrived for you."
 * Titles decrypt locally under zero-knowledge; skeleton strokes hold the
 * space until the master key lands.
 */
export function LetterArrivalCard({
  letters,
  accountEncrypted,
}: {
  letters: LetterMetaRecord[];
  accountEncrypted: boolean;
}) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const encrypted = accountEncrypted && isClientEncrypted;

  const [titles, setTitles] = useState<Record<string, string>>({});
  const ready = !encrypted || Object.keys(titles).length >= letters.length;

  useEffect(() => {
    if (!encrypted || !masterKey) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const letter of letters) {
        next[letter.id] =
          letter.title && looksCipher(letter.title)
            ? await decryptText(letter.title, masterKey).catch(() => "")
            : letter.title;
        if (cancelled) return;
      }
      setTitles(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [encrypted, masterKey, letters]);

  const [letter] = letters;
  if (!letter) return null;
  const extraCount = letters.length - 1;

  return (
    <Link
      href="/letters"
      aria-label={`A letter arrived: ${ready ? titles[letter.id] || "an untitled letter" : "loading"}. Open your letters.`}
      className="group bg-card focus-visible:ring-ring relative block w-full cursor-pointer overflow-hidden rounded-xl border transition-all duration-200 hover:border-accent/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <GoldEdge />
      <div className="relative flex items-start gap-4 p-5">
        <EnvelopeDisc />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground/70 font-hand text-base leading-snug">
            a letter arrived for you
          </p>
          {!ready ? (
            <div className="bg-muted/60 mt-1 h-4 w-2/3 animate-pulse rounded-md" />
          ) : (
            <p className="text-foreground truncate font-serif text-lg font-semibold">
              {titles[letter.id] || "An untitled letter"}
            </p>
          )}
          <p className="text-caption text-muted-foreground/60 mt-1">
            written{" "}
            {formatDisplayDate(letter.createdAt.slice(0, 10), {
              year: undefined,
            })}{" "}
            · opened on{" "}
            {formatDisplayDate(letter.unlockDate, { year: undefined })}
            {extraCount > 0 ? ` · ${extraCount} more waiting` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
