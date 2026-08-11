"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import { MandatorySanctuarySetup } from "../../encryption/components/mandatory-sanctuary-setup";
import { SanctuaryPasswordUnlockScreen } from "../../encryption/components/sanctuary-password-unlock-screen";
import { getLockSettingsAction, lockAction } from "../../lock/actions/lock-actions";
import { LockScreen } from "../../lock/components/lock-screen";
import { LockSetupOnboarding } from "../../lock/components/lock-setup-onboarding";
import { useLockTimer } from "../../lock/hooks/use-lock-timer";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface LockSettingsSeed {
  isLockEnabled: boolean;
  hasPasscode: boolean;
  autoLockTimeout: number;
  lockOnTabHide: boolean;
}

interface EncryptionSettingsSeed {
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
}

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
  /** Set when the server layout verified the unlock cookie before rendering the shell. */
  sessionUnlocked?: boolean;
  /** Server-seeded lock settings so the shell boots configured without a round-trip. */
  initialLockSettings?: LockSettingsSeed | null;
  /** Server-seeded encryption settings so the shell boots configured without a round-trip. */
  initialEncryptionSettings?: EncryptionSettingsSeed | null;
}

export function AppShell({
  children,
  user,
  sessionUnlocked = false,
  initialLockSettings = null,
  initialEncryptionSettings = null,
}: AppShellProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const {
    isClientEncrypted,
    masterKey,
    setEncryptionSettings,
    lock: lockEncryption,
  } = useEncryption();

  const [isLockEnabled, setIsLockEnabled] = React.useState(
    () => initialLockSettings?.isLockEnabled ?? false,
  );
  const [hasPasscode, setHasPasscode] = React.useState(
    () => initialLockSettings?.hasPasscode ?? true,
  );
  const [autoLockTimeout] = React.useState(
    () => initialLockSettings?.autoLockTimeout ?? 300,
  );
  const [lockOnTabHide] = React.useState(
    () => initialLockSettings?.lockOnTabHide ?? true,
  );
  const [showSetupPrompt, setShowSetupPrompt] = React.useState(false);

  // Server layout already validated the unlock cookie; client state tracks in-session auto-lock only.
  const [isUnlocked, setIsUnlocked] = React.useState(
    () => sessionUnlocked || !user,
  );

  // Seed the encryption provider from server-rendered settings. No network
  // round-trip on mount — the layout already loaded these values. Layout effect
  // so existing encrypted users never flash the setup screen before the seed.
  React.useLayoutEffect(() => {
    if (initialEncryptionSettings) {
      setEncryptionSettings(initialEncryptionSettings);
    }
  }, [initialEncryptionSettings, setEncryptionSettings]);

  // Prompt users without a diary passcode to set one up on first launch.
  React.useEffect(() => {
    if (!user || initialLockSettings?.hasPasscode) return;
    const timer = setTimeout(() => {
      const dismissed = sessionStorage.getItem("withink_lock_setup_dismissed");
      if (!dismissed) {
        setShowSetupPrompt(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user, initialLockSettings?.hasPasscode]);

  const handleLock = React.useCallback(async () => {
    setIsUnlocked(false);
    lockEncryption();
    await lockAction();

    // Re-sync the authoritative lock config so the unlock screen shown on the
    // next render isn't based on stale one-shot state (e.g. the lock was just
    // enabled or the PIN just set in this session).
    try {
      const res = await getLockSettingsAction();
      if (res.success && res.data) {
        setIsLockEnabled(res.data.isLockEnabled);
        setHasPasscode(res.data.hasPasscode);
      }
    } catch {
      // Best-effort; fall back to current client state.
    }
  }, [lockEncryption]);

  // PIN lock requires the master key in memory; re-lock if the cookie is valid but the key was cleared (refresh).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hasLocalEncryptedKey = !!localStorage.getItem(
      "withink_encrypted_master_key",
    );
    if (
      isClientEncrypted &&
      !masterKey &&
      isUnlocked &&
      isLockEnabled &&
      hasPasscode &&
      hasLocalEncryptedKey
    ) {
      // Schedule lock outside the effect to avoid synchronous setState
      const timer = setTimeout(() => {
        setIsUnlocked(false);
        lockEncryption();
        void lockAction();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [
    isClientEncrypted,
    masterKey,
    isUnlocked,
    isLockEnabled,
    hasPasscode,
    lockEncryption,
  ]);

  const handleUnlockSuccess = React.useCallback(() => {
    setIsUnlocked(true);
  }, []);

  const [showPinSetup, setShowPinSetup] = React.useState(false);
  const [pendingPin, setPendingPin] = React.useState("");
  // True when this device unlocked with the Sanctuary Password but has no
  // locally-encrypted master key, even though the account has a PIN set. The
  // PIN encrypts the master key per-device, so a new device must bind its own.
  const [showPinRebind, setShowPinRebind] = React.useState(false);

  const handleSetupSuccess = (
    masterKeyHex?: string,
    salt?: string,
    verificationCiphertext?: string,
    pin?: string,
  ) => {
    setShowSetupPrompt(false);
    setIsLockEnabled(true);
    setHasPasscode(true);
    setIsUnlocked(true);
    if (pin) {
      setPendingPin(pin);
      setShowPinSetup(true);
    }
  };

  const handlePinSetupSuccess = () => {
    setShowPinSetup(false);
    setPendingPin("");
    setShowPinRebind(false);
    // The rebind path doesn't run through handleSetupSuccess, so make sure the
    // lock config flags reflect the completed PIN binding (avoids a stale
    // "no passcode" state that would route to the Sanctuary Password screen).
    setIsLockEnabled(true);
    setHasPasscode(true);
  };

  // Per-device PIN binding: after the master key is in memory (unlocked via the
  // Sanctuary Password) but there is no local PIN key, prompt the user to set a
  // PIN on this device so the fast-unlock PIN works here too.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const needsRebind =
      isClientEncrypted &&
      !!masterKey &&
      isLockEnabled &&
      hasPasscode &&
      !localStorage.getItem("withink_encrypted_master_key");
    // Schedule outside the effect to avoid synchronous setState in an effect.
    const timer = setTimeout(() => setShowPinRebind(needsRebind), 0);
    return () => clearTimeout(timer);
  }, [isClientEncrypted, masterKey, isLockEnabled, hasPasscode]);

  useLockTimer({
    // Pause auto/tab lock while a PIN setup or rebind flow is open so the
    // in-memory master key can't be wiped mid-binding.
    isLockEnabled:
      isLockEnabled && hasPasscode && !(showPinSetup || showPinRebind || showSetupPrompt),
    timeoutMs: autoLockTimeout * 1000,
    lockOnTabHide,
    isLocked: !isUnlocked,
    onLock: handleLock,
  });

  React.useEffect(() => {
    const saved = localStorage.getItem("withink_sidebar_collapsed");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === "true");
    }
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(
        new RegExp("(^| )" + name + "=([^;]+)"),
      );
      return match ? match[2] : null;
    };

    const localDateStr = getLocalDateString();
    const existingCookie = getCookie("withink-local-date");

    if (existingCookie !== localDateStr) {
      document.cookie = `withink-local-date=${localDateStr}; path=/; max-age=31536000; SameSite=Lax`;
      // Use a soft refresh (not a full reload) so in-memory client state such as
      // the decrypted master key survives. A hard reload on a new device would
      // re-prompt for the Sanctuary Password immediately after unlocking.
      router.refresh();
    }
  }, [router]);

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    localStorage.setItem("withink_sidebar_collapsed", String(nextCollapsed));
  };

  const hasLocalEncryptedKey =
    typeof window !== "undefined"
      ? !!localStorage.getItem("withink_encrypted_master_key")
      : false;

  const showPasswordUnlockPrompt = React.useMemo(() => {
    return (
      isClientEncrypted &&
      !masterKey &&
      (!isLockEnabled || !hasPasscode || !hasLocalEncryptedKey)
    );
  }, [
    isClientEncrypted,
    masterKey,
    isLockEnabled,
    hasPasscode,
    hasLocalEncryptedKey,
  ]);

  if (user && !isClientEncrypted) {
    return (
      <MandatorySanctuarySetup
        diaryLockEnabled={isLockEnabled}
        diaryHasPasscode={hasPasscode}
        onSetupSuccess={handleSetupSuccess}
      />
    );
  }

  if (user && showPinSetup && pendingPin) {
    return (
      <LockSetupOnboarding
        pin={pendingPin}
        onSetupSuccess={handlePinSetupSuccess}
        onCancel={() => {
          setShowPinSetup(false);
          setPendingPin("");
        }}
      />
    );
  }

  if (user && showPinRebind) {
    return (
      <LockSetupOnboarding
        onSetupSuccess={handlePinSetupSuccess}
        onCancel={() => setShowPinRebind(false)}
      />
    );
  }

  return (
    <>
      {user && !isUnlocked && !masterKey && !showPasswordUnlockPrompt && (
        <LockScreen
          onUnlockSuccess={handleUnlockSuccess}
          userEmail={user.email}
        />
      )}

      {user && showPasswordUnlockPrompt && (
        <SanctuaryPasswordUnlockScreen
          userEmail={user.email}
          onUnlockSuccess={handleUnlockSuccess}
        />
      )}

      {user && showSetupPrompt && (
        <LockSetupOnboarding
          onSetupSuccess={handleSetupSuccess}
          onCancel={() => setShowSetupPrompt(false)}
        />
      )}

      <div
        className="bg-background flex h-screen w-full overflow-hidden"
        style={
          {
            "--sidebar-width": isCollapsed ? "64px" : "256px",
          } as React.CSSProperties
        }
      >
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground focus:border-border focus:ring-ring sr-only text-sm font-medium focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-xl focus:border focus:px-4 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        <Sidebar
          isCollapsed={mounted ? isCollapsed : false}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          user={user}
        />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onOpenMobile={() => setIsMobileOpen(true)} />

          <main
            id="main-content"
            className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
