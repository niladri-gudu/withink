"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@withink/utils";
import { toast } from "sonner";

import { safeStorage } from "@/lib/safe-storage";
import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import { DiaryPasswordUnlockScreen } from "../../encryption/components/diary-password-unlock-screen";
import { MandatoryDiarySetup } from "../../encryption/components/mandatory-diary-setup";
import { lockAction } from "../../lock/actions/lock-actions";
import { LockScreen } from "../../lock/components/lock-screen";
import { LockSetupOnboarding } from "../../lock/components/lock-setup-onboarding";
import { UnlockProofBindCard } from "../../lock/components/unlock-proof-bind-card";
import { useLockTimer } from "../../lock/hooks/use-lock-timer";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";

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
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // The editor route is fullscreen writing: the tab bar hides and the page
  // doesn't reserve bottom clearance for it.
  const isEditorRoute = /^\/entries\/[^/]+$/.test(pathname ?? "");

  const {
    isClientEncrypted,
    encryptionSettingsSeeded,
    masterKey,
    setEncryptionSettings,
    proofBindingRequired,
    lock: lockEncryption,
  } = useEncryption();

  // Per-device diary lock: each device keeps its own "lock on/off" flag (and
  // its own PIN-bound key), defaulting to OFF on a new device. The server's
  // account-level lock settings are synced when saving, but the device flag is
  // the source of truth for whether this device gates behind the PIN screen.
  // State starts at the deterministic server value and syncs from storage in
  // an effect — reading localStorage during the hydration render would
  // mismatch the server-rendered HTML.
  const [isLockEnabled, setIsLockEnabled] = React.useState(false);
  const [hasPasscode, setHasPasscode] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLockEnabled(safeStorage.getItem("withink_lock_enabled") === "true");
    setHasPasscode(!!safeStorage.getItem("withink_encrypted_master_key"));
  }, []);
  const [autoLockTimeout] = React.useState(
    () => initialLockSettings?.autoLockTimeout ?? 300,
  );
  const [lockOnTabHide] = React.useState(
    () => initialLockSettings?.lockOnTabHide ?? false,
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
      const dismissed = safeStorage.getSessionItem(
        "withink_lock_setup_dismissed",
      );
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
  }, [lockEncryption]);

  // PIN lock requires the master key in memory; re-lock if the cookie is valid but the key was cleared (refresh).
  React.useEffect(() => {
    const hasLocalEncryptedKey = !!safeStorage.getItem(
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

  // Which screen the lock overlay boots into (reset on every normal unlock).
  const [lockView, setLockView] = React.useState<"pin" | "password-verify">(
    "pin",
  );

  const handleUnlockSuccess = React.useCallback(() => {
    setIsUnlocked(true);
    setLockView("pin");
  }, []);

  // The server accepted the unlock (cookie set) — refresh so content gated by
  // the server-side lock streams in behind the already-revealed UI.
  const handleUnlockedSynced = React.useCallback(() => {
    router.refresh();
  }, [router]);

  // The unlock is verified locally first and the server check runs in the
  // background. If the server rejects the PIN (rotated on another device), roll
  // the session back and route the user to the Diary Password recovery flow.
  const handleServerReject = React.useCallback(() => {
    lockEncryption();
    setIsUnlocked(false);
    setLockView("password-verify");
    toast.error("Passcode is out of sync. Use your Diary Password to unlock.");
  }, [lockEncryption]);

  const handleSetupSuccess = (
    _masterKeyHex?: string,
    _salt?: string,
    _verificationCiphertext?: string,
    pin?: string,
  ) => {
    setShowSetupPrompt(false);
    setIsUnlocked(true);
    // Only mark the passcode lock as active when a PIN was actually provided. A
    // password-only setup (e.g. a brand-new user) leaves the lock off until they
    // set a passcode via the first-launch prompt.
    setIsLockEnabled(!!pin);
    setHasPasscode(!!pin);
    if (pin && typeof window !== "undefined") {
      localStorage.setItem("withink_lock_enabled", "true");
    }
  };

  useLockTimer({
    // Pause auto/tab lock while the first-launch PIN setup is open so the
    // in-memory master key can't be wiped mid-binding.
    isLockEnabled: isLockEnabled && hasPasscode && !showSetupPrompt,
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
      // re-prompt for the Diary Password immediately after unlocking.
      router.refresh();
    }

    // Persist the client timezone offset so SSR can render timezone-correct
    // insights (and avoid a client-side recompute) on the next navigation.
    const tzOffset = new Date().getTimezoneOffset();
    if (getCookie("withink-tz-offset") !== String(tzOffset)) {
      document.cookie = `withink-tz-offset=${tzOffset}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [router]);

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    safeStorage.setItem("withink_sidebar_collapsed", String(nextCollapsed));
  };

  // Synced from storage after mount (see the lock flags above) so the gate
  // decision is hydration-stable.
  const [hasLocalEncryptedKey, setHasLocalEncryptedKey] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasLocalEncryptedKey(
      !!safeStorage.getItem("withink_encrypted_master_key"),
    );
  }, []);

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

  // While a gate screen is up, the diary underneath must be inert to assistive
  // tech — otherwise screen readers and keyboard focus can browse locked
  // content behind the overlay. (The server already withholds gated content;
  // this covers the client-side lock states too.)
  const isGated =
    !!user && (!isUnlocked || showPasswordUnlockPrompt || showSetupPrompt);

  // Wait for the server-seeded encryption settings before deciding this is a
  // legacy (non-ZK) account: mounting MandatoryDiarySetup during the pre-seed
  // window flashed the wrong screen and fired migration actions on every load.
  if (user && !isClientEncrypted && encryptionSettingsSeeded) {
    return (
      <MandatoryDiarySetup
        diaryLockEnabled={isLockEnabled}
        diaryHasPasscode={hasPasscode}
        onSetupSuccess={handleSetupSuccess}
      />
    );
  }

  if (user && !isClientEncrypted && !encryptionSettingsSeeded) {
    return (
      <div className="bg-background flex h-screen w-full items-center justify-center">
        <div className="border-border bg-card w-full max-w-md animate-pulse rounded-xl border p-8" />
      </div>
    );
  }

  return (
    <>
      {user && !isUnlocked && !masterKey && !showPasswordUnlockPrompt && (
        <LockScreen
          onUnlockSuccess={handleUnlockSuccess}
          onServerReject={handleServerReject}
          onUnlockedSynced={handleUnlockedSynced}
          initialView={lockView}
          userEmail={user.email}
        />
      )}

      {user && showPasswordUnlockPrompt && (
        <DiaryPasswordUnlockScreen
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

      {user && proofBindingRequired && <UnlockProofBindCard />}

      <div
        className="bg-background flex h-screen w-full overflow-hidden"
        inert={isGated ? true : undefined}
        style={
          {
            "--sidebar-width": isCollapsed ? "76px" : "264px",
          } as React.CSSProperties
        }
      >
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground focus:border-border focus:ring-ring focus:z-9999 sr-only text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-xl focus:border focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <Sidebar
          isCollapsed={mounted ? isCollapsed : false}
          onToggleCollapse={handleToggleCollapse}
          user={user}
        />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />

          <main
            id="main-content"
            // Focusable target so the skip link reliably moves focus here.
            tabIndex={-1}
            className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto focus:outline-none"
          >
            <div className="flex w-full flex-1 flex-col items-center">
              {/* Phones reserve clearance for the bottom tab bar (plus the
                  iOS home indicator); the fullscreen editor route doesn't. */}
              <div
                className={cn(
                  "w-full max-w-4xl flex-1 px-6 pt-8 lg:px-8",
                  isEditorRoute
                    ? "pb-8"
                    : "pb-[calc(4.75rem+env(safe-area-inset-bottom))]",
                  "md:py-12",
                )}
              >
                {children}
              </div>
            </div>
          </main>

          {!isGated && !isEditorRoute && <TabBar user={user} />}
        </div>
      </div>
    </>
  );
}
