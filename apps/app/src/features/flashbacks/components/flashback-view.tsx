"use client";

import { useEffect, useState, useTransition } from "react";

import { safeDecryptText } from "@/lib/crypto-client";
import { useEncryption } from "@/providers/encryption-provider";

import type { DecryptedEntry } from "../../journal/services/journal-service";
import { refreshFlashbackAction } from "../actions/flashback-actions";
import {
  FlashbackReader,
  type FlashbackDisplayEntry,
} from "./flashback-reader";

interface FlashbackViewProps {
  initialEntry: DecryptedEntry | null;
  initialLabel: string;
  localToday: string;
}

/**
 * Server-entry flashback path (legacy accounts): the server chose today's
 * memory, and this component decrypts its fields with the in-memory key.
 * Zero-knowledge accounts use `FlashbackViewLocal` instead.
 */
export function FlashbackView({
  initialEntry,
  initialLabel,
  localToday,
}: FlashbackViewProps) {
  const [entry, setEntry] = useState<DecryptedEntry | null>(initialEntry);
  const [label, setLabel] = useState<string>(initialLabel);
  const [isPending, startTransition] = useTransition();
  const { isClientEncrypted, masterKey } = useEncryption();

  const [display, setDisplay] = useState<FlashbackDisplayEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!entry) {
        if (!cancelled) {
          setDisplay(null);
          setLoading(false);
        }
        return;
      }

      let title: string;
      let contentText: string;
      let contentHtml: string;

      if (isClientEncrypted && masterKey) {
        title = await safeDecryptText(entry.title || "", masterKey);
        contentText = await safeDecryptText(entry.contentText || "", masterKey);
        contentHtml = await safeDecryptText(entry.contentHtml || "", masterKey);
      } else {
        title = entry.title || "";
        contentText = entry.contentText || "";
        contentHtml = entry.contentHtml || "";
      }

      if (cancelled) return;
      setDisplay({
        date: entry.date,
        title: title || "Untitled Memory",
        contentText,
        contentHtml,
        mood: entry.mood,
        wordCount: entry.wordCount,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [entry, isClientEncrypted, masterKey]);

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await refreshFlashbackAction(localToday);
      if (result.success && result.data) {
        setEntry(result.data.entry);
        setLabel(result.data.label);
      } else {
        // Fallback or empty state if no other flashback available.
        setEntry(null);
        setLabel("");
      }
    });
  };

  return (
    <FlashbackReader
      entry={display}
      label={label}
      localToday={localToday}
      loading={loading}
      onRefresh={handleRefresh}
      isRefreshing={isPending}
    />
  );
}
