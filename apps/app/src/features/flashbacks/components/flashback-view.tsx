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
  /** The server read failed before the page rendered. */
  initialError?: boolean;
}

const LOAD_ERROR_COPY =
  "Your memories couldn't be fetched just now — nothing is lost. Try again in a moment.";

/**
 * Server-entry flashback path (legacy accounts): the server chose today's
 * memory, and this component decrypts its fields with the in-memory key.
 * Zero-knowledge accounts use `FlashbackViewLocal` instead.
 */
export function FlashbackView({
  initialEntry,
  initialLabel,
  localToday,
  initialError = false,
}: FlashbackViewProps) {
  const [entry, setEntry] = useState<DecryptedEntry | null>(initialEntry);
  const [label, setLabel] = useState<string>(initialLabel);
  const [error, setError] = useState<string | null>(
    initialError ? LOAD_ERROR_COPY : null,
  );
  const [isPending, startTransition] = useTransition();
  const { isClientEncrypted, masterKey } = useEncryption();

  const [display, setDisplay] = useState<FlashbackDisplayEntry | null>(null);
  const [loading, setLoading] = useState(!initialError);

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

  const load = () => {
    startTransition(async () => {
      const result = await refreshFlashbackAction(localToday);
      if (result.success) {
        // A null payload is a legitimate "no other memory" answer; only a
        // failed call is an error.
        setError(null);
        setLoading(false);
        setEntry(result.data?.entry ?? null);
        setLabel(result.data?.label ?? "");
      } else {
        // Keep whatever memory is on screen and surface the failure.
        setLoading(false);
        setError(LOAD_ERROR_COPY);
      }
    });
  };

  return (
    <FlashbackReader
      entry={display}
      label={label}
      localToday={localToday}
      loading={loading}
      onRefresh={load}
      isRefreshing={isPending}
      error={error}
      onRetry={load}
    />
  );
}
