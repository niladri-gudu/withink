"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { EDITOR_ROUTE_PATTERN } from "@/constants/routes";
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

  // The editor route is a TRUE fullscreen writing surface: no mobile
  // masthead, no tab bar, and none of the page-content padding — the editor
  // owns its entire layout (header, overlays, scroll affordances). See the
  // journal surface brief and the z-index contract in globals.css.
  const isFullscreenRoute = EDITOR_ROUTE_PATTERN.test(pathname ?? "");

  const {
    isClientEncrypted,
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
  // The server passes null when no settings doc exists yet (brand-new users);
  // seeding the same defaults getEncryptionSettingsAction returned for that
  // case is required — otherwise encryptionSettingsSeeded never flips true and
  // the shell renders its pulsing placeholder forever.
  React.useLayoutEffect(() => {
    setEncryptionSettings(
      initialEncryptionSettings ?? {
        isClientEncrypted: false,
        encryptionSalt: "",
        verificationCiphertext: "",
      },
    );
  }, [initialEncryptionSettings, setEncryptionSettings]);

  // One-time, dismissible PIN hint. Only fires when the setup can actually
  // succeed: the account is zero-knowledge AND the master key is in memory
  // (right after Diary Password setup / an in-session unlock). Prompting in
  // any other state is what made the gate re-appear forever while the device
  // binding silently failed. Dismissal persists in localStorage so it never
  // nags again; the passcode stays opt-in via Settings.
  React.useEffect(() => {
    if (
      !user ||
      initialLockSettings?.hasPasscode ||
      !isClientEncrypted ||
      !masterKey ||
      safeStorage.getItem("withink_pin_setup_dismissed") === "true"
    ) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowSetupPrompt(true);
  }, [user, initialLockSettings?.hasPasscode, isClientEncrypted, masterKey]);

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
    // password-only setup (e.g. a brand-new user) leaves the lock off until
    // they opt in via Settings or the one-time hint.
    setIsLockEnabled(!!pin);
    setHasPasscode(!!pin);
    if (pin) {
      // Persist the dismissal too: a completed setup must never re-show the
      // hint if the effect re-runs later (e.g. after a router.refresh()).
      safeStorage.setItem("withink_lock_enabled", "true");
      safeStorage.setItem("withink_pin_setup_dismissed", "true");
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
  // Known-unencrypted account (no settings doc yet, or a legacy doc with the
  // flag off). Decide from the server-provided prop, NOT the client-only
  // seeded flag: during SSR/hydration the provider hasn't been seeded yet, so
  // gating on it emitted the pulsing placeholder in the initial HTML and left
  // every fresh signup staring at it until JavaScript finished loading.
  if (
    user &&
    !isClientEncrypted &&
    (!initialEncryptionSettings || !initialEncryptionSettings.isClientEncrypted)
  ) {
    return (
      <MandatoryDiarySetup
        diaryLockEnabled={isLockEnabled}
        diaryHasPasscode={hasPasscode}
        onSetupSuccess={handleSetupSuccess}
      />
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
          onCancel={() => {
            setShowSetupPrompt(false);
            // "Maybe later" is permanent: the hint never re-appears. The
            // passcode remains available any time via Settings.
            safeStorage.setItem("withink_pin_setup_dismissed", "true");
          }}
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
          className="focus:bg-background focus:text-foreground focus:border-border focus:ring-ring sr-only text-sm font-medium focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:rounded-xl focus:border focus:px-4 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        <Sidebar
          isCollapsed={mounted ? isCollapsed : false}
          onToggleCollapse={handleToggleCollapse}
          user={user}
        />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isFullscreenRoute && <Header />}

          <main
            id="main-content"
            // Focusable target so the skip link reliably moves focus here.
            tabIndex={-1}
            className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto focus:outline-none"
          >
            {/* Fullscreen routes (the journal editor) render full-bleed and
                own their entire layout; every other page sits in the shared
                centered content column. This branch — not negative-margin
                hacks — is the documented escape hatch from shell padding. */}
            {isFullscreenRoute ? (
              children
            ) : (
              <div className="flex w-full flex-1 flex-col items-center">
                {/* Phones reserve clearance for the bottom tab bar (plus the
                    iOS home indicator). */}
                <div className="w-full max-w-4xl flex-1 px-6 pt-8 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:py-12 lg:px-8">
                  {children}
                </div>
              </div>
            )}
          </main>

          {!isGated && !isFullscreenRoute && <TabBar user={user} />}
        </div>
      </div>
    </>
  );
}
