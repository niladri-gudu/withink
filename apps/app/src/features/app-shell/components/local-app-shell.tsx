"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { LocalProfile } from "@withink/core";

import { getLocalDateString } from "@/lib/utils/date";
import {
  clearZkHintCookie,
  readLocalProfile,
  readZkHintCookie,
} from "@/features/profile/local-profile";

import { AppShell } from "./app-shell";
import { AppShellSkeleton } from "./app-shell-skeleton";

interface LocalAppShellProps {
  children: React.ReactNode;
}

/**
 * Shell for a browser that already stored a zero-knowledge profile and carries
 * the `withink-zk` hint cookie. It resolves the gate from IndexedDB instead of
 * waiting on the server session/lock/encryption reads.
 *
 * The hint is only set for ZK accounts (whose streamed RSC content is
 * ciphertext), so legacy plaintext accounts keep the server gate. If the
 * profile is missing or no longer encrypted, the hint is dropped and the next
 * render falls back to the server-gated shell.
 */
export function LocalAppShell({ children }: LocalAppShellProps) {
  const router = useRouter();
  const [profile, setProfile] = React.useState<LocalProfile | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void readLocalProfile().then((stored) => {
      if (cancelled) return;
      const hintAccount = readZkHintCookie();
      if (
        !stored ||
        !stored.encryption.isClientEncrypted ||
        !stored.accountId ||
        // Different account signed in on this browser (or a legacy "1"
        // hint): fall back to the server gate instead of showing a stale
        // profile's local journal.
        hintAccount !== stored.accountId
      ) {
        clearZkHintCookie();
        router.refresh();
        return;
      }
      setProfile(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !profile) {
    return <AppShellSkeleton />;
  }

  return (
    <AppShell
      user={profile.user}
      // The master key is the real gate for ZK content; server actions still
      // enforce the unlock cookie for writes and sync.
      sessionUnlocked
      initialLockSettings={profile.lock}
      initialEncryptionSettings={profile.encryption}
      serverToday={getLocalDateString()}
    >
      {children}
    </AppShell>
  );
}
