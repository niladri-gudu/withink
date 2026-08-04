"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getLockSettingsAction } from "../actions/lock-actions";
import { getEncryptionSettingsAction } from "../../encryption/actions/encryption-actions";
import { LockScreen } from "./lock-screen";
import { SanctuaryPasswordUnlockScreen } from "../../encryption/components/sanctuary-password-unlock-screen";
import { BrandLoader } from "@/components/ui/brand-loader";
import { useEncryption } from "@/providers/encryption-provider";

interface SanctuaryLockGateProps {
  userEmail?: string | null;
}

export function SanctuaryLockGate({ userEmail }: SanctuaryLockGateProps) {
  const router = useRouter();
  const { masterKey, setEncryptionSettings } = useEncryption();
  const [hasPasscode, setHasPasscode] = React.useState(true);
  const [hasLocalKey, setHasLocalKey] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Once the master key has been decrypted client-side (via Sanctuary Password
  // or PIN), this gate is already unlocked. Do not show the lock screens again —
  // poll the server until it observes the unlock cookie, then refresh so the
  // layout swaps this gate for the real app.
  React.useEffect(() => {
    if (!masterKey) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await getLockSettingsAction();
        if (cancelled) return;
        if (res.success && res.data?.isUnlocked) {
          router.refresh();
          return;
        }
      } catch {
        // fall through to retry
      }
      attempts++;
      if (attempts < 10) {
        setTimeout(poll, 500);
      } else {
        // Server never observed the cookie (rare). Fall back to a hard reload.
        window.location.reload();
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [masterKey, router]);

  React.useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const [lockRes, encryptionRes] = await Promise.all([
          getLockSettingsAction(),
          getEncryptionSettingsAction(),
        ]);

        if (cancelled) return;

        if (encryptionRes.success && encryptionRes.data) {
          setEncryptionSettings(encryptionRes.data);
        }

        if (lockRes.success && lockRes.data) {
          if (lockRes.data.isUnlocked) {
            router.refresh();
            return;
          }
          setHasPasscode(lockRes.data.hasPasscode);
        }

        // The PIN lock can only decrypt the locally-encrypted master key when
        // that key exists in localStorage. Otherwise fall back to the password.
        setHasLocalKey(!!localStorage.getItem("withink_encrypted_master_key"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [router, setEncryptionSettings]);

  const handleUnlockSuccess = React.useCallback(() => {
    router.refresh();
  }, [router]);

  if (loading) {
    return <BrandLoader message="unlocking your sanctuary..." />;
  }

  // Keep showing a loader until the server observes the unlock instead of
  // flashing the (already satisfied) PIN/password screen back at the user.
  if (masterKey) {
    return <BrandLoader message="unlocking your sanctuary..." />;
  }

  if (hasPasscode && hasLocalKey) {
    return <LockScreen onUnlockSuccess={handleUnlockSuccess} userEmail={userEmail} />;
  }

  return (
    <SanctuaryPasswordUnlockScreen userEmail={userEmail} onUnlockSuccess={handleUnlockSuccess} />
  );
}