"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useLockTimer } from "../../lock/hooks/use-lock-timer";
import { LockScreen } from "../../lock/components/lock-screen";
import { LockSetupOnboarding } from "../../lock/components/lock-setup-onboarding";
import { getLockSettingsAction, lockAction } from "../../lock/actions/lock-actions";
import { useEncryption } from "@/providers/encryption-provider";
import { getEncryptionSettingsAction } from "../../encryption/actions/encryption-actions";
import { SanctuaryPasswordUnlockScreen } from "../../encryption/components/sanctuary-password-unlock-screen";
import { MandatorySanctuarySetup } from "../../encryption/components/mandatory-sanctuary-setup";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const {
    isClientEncrypted,
    masterKey,
    setEncryptionSettings,
  } = useEncryption();

  // Lock feature states - initialized safely to avoid flashes
  const [isLockEnabled, setIsLockEnabled] = React.useState(false);
  const [hasPasscode, setHasPasscode] = React.useState(true);
  const [autoLockTimeout, setAutoLockTimeout] = React.useState(300); // 5m default
  const [lockOnTabHide, setLockOnTabHide] = React.useState(true);
  const [showSetupPrompt, setShowSetupPrompt] = React.useState(false);
  const [loadingEncryption, setLoadingEncryption] = React.useState(true);

  const [isUnlocked, setIsUnlocked] = React.useState(() => {
    if (typeof window === "undefined") return true;
    const lockEnabled = localStorage.getItem("withink_lock_enabled") === "true";
    const tabUnlocked = sessionStorage.getItem("withink_tab_unlocked") === "true";
    if (lockEnabled && !tabUnlocked) return false;
    return true;
  });

  // Fetch lock configurations on mount/auth change
  React.useEffect(() => {
    if (!user) return;

    const checkLockStatus = async () => {
      const res = await getLockSettingsAction();
      if (res.success && res.data) {
        setIsLockEnabled(res.data.isLockEnabled);
        setHasPasscode(res.data.hasPasscode);
        setAutoLockTimeout(res.data.autoLockTimeout);
        setLockOnTabHide(res.data.lockOnTabHide);
        setIsUnlocked(res.data.isUnlocked);

        // Update local storage configurations for zero-flash page loads
        localStorage.setItem("withink_lock_enabled", String(res.data.isLockEnabled));
        if (res.data.isUnlocked) {
          sessionStorage.setItem("withink_tab_unlocked", "true");
        } else {
          sessionStorage.removeItem("withink_tab_unlocked");
        }

        // Onboarding prompt if user has no passcode set
        if (!res.data.hasPasscode) {
          const dismissed = sessionStorage.getItem("withink_lock_setup_dismissed");
          if (!dismissed) {
            setShowSetupPrompt(true);
          }
        }
      }
    };

    const checkEncryptionStatus = async () => {
      try {
        setLoadingEncryption(true);
        const res = await getEncryptionSettingsAction();
        if (res.success && res.data) {
          setEncryptionSettings(res.data);
        }
      } catch (err) {
        console.error("Failed to load encryption settings:", err);
      } finally {
        setLoadingEncryption(false);
      }
    };

    checkLockStatus();
    checkEncryptionStatus();
  }, [user, setEncryptionSettings]);

  const handleLock = React.useCallback(async () => {
    setIsUnlocked(false);
    sessionStorage.removeItem("withink_tab_unlocked");
    await lockAction();
  }, []);

  // Force PIN-lock screen to show if client encryption is active but master key is missing
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hasLocalEncryptedKey = !!localStorage.getItem("withink_encrypted_master_key");
    if (isClientEncrypted && !masterKey && isUnlocked && isLockEnabled && hasPasscode && hasLocalEncryptedKey) {
      handleLock();
    }
  }, [isClientEncrypted, masterKey, isUnlocked, isLockEnabled, hasPasscode, handleLock]);

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    sessionStorage.setItem("withink_tab_unlocked", "true");
  };

  const handleSetupSuccess = () => {
    setShowSetupPrompt(false);
    setIsLockEnabled(true);
    setHasPasscode(true);
    setIsUnlocked(true);
    localStorage.setItem("withink_lock_enabled", "true");
    sessionStorage.setItem("withink_tab_unlocked", "true");
  };

  const handleSetupDismiss = () => {
    setShowSetupPrompt(false);
    sessionStorage.setItem("withink_lock_setup_dismissed", "true");
  };

  // Bind the inactivity & visibility auto-lock timer hook
  useLockTimer({
    isLockEnabled: isLockEnabled && hasPasscode,
    timeoutMs: autoLockTimeout * 1000,
    lockOnTabHide,
    isLocked: !isUnlocked,
    onLock: handleLock,
  });

  // Synchronize collapse state with localStorage on mount to prevent hydration flash
  React.useEffect(() => {
    const saved = localStorage.getItem("withink_sidebar_collapsed");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === "true");
    }
    setMounted(true);
  }, []);

  // Synchronize client local date with a cookie for server components
  React.useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? match[2] : null;
    };

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const localDateStr = `${year}-${month}-${day}`;

    const existingCookie = getCookie("withink-local-date");

    if (existingCookie !== localDateStr) {
      document.cookie = `withink-local-date=${localDateStr}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.reload();
    }
  }, []);

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    localStorage.setItem("withink_sidebar_collapsed", String(nextCollapsed));
  };

  const showPasswordUnlockPrompt = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const hasLocalEncryptedKey = !!localStorage.getItem("withink_encrypted_master_key");
    return isClientEncrypted && !masterKey && (!isLockEnabled || !hasPasscode || !hasLocalEncryptedKey);
  }, [isClientEncrypted, masterKey, isLockEnabled, hasPasscode]);


  if (user && loadingEncryption) {
    return (
      <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
            Preparing your private sanctuary...
          </p>
        </div>
      </div>
    );
  }

  if (user && !loadingEncryption && !isClientEncrypted) {
    return (
      <MandatorySanctuarySetup
        diaryLockEnabled={isLockEnabled}
        diaryHasPasscode={hasPasscode}
        onSetupSuccess={() => {}}
      />
    );
  }

  return (
    <>
      {user && !isUnlocked && !showPasswordUnlockPrompt && (
        <LockScreen
          onUnlockSuccess={handleUnlockSuccess}
          userEmail={user.email}
        />
      )}

      {user && showPasswordUnlockPrompt && (
        <SanctuaryPasswordUnlockScreen
          userEmail={user.email}
        />
      )}

      {user && showSetupPrompt && (
        <LockSetupOnboarding
          onSetupSuccess={handleSetupSuccess}
          onDismiss={handleSetupDismiss}
        />
      )}

      <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Skip to main content link for keyboard navigation accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm font-medium"
      >
        Skip to main content
      </a>

      {/* Sidebar navigation */}
      <Sidebar
        isCollapsed={mounted ? isCollapsed : false}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        user={user}
      />

      {/* Main panel layout container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <Header onOpenMobile={() => setIsMobileOpen(true)} />

        {/* Scrollable page area */}
        <main id="main-content" className="flex-1 overflow-y-auto min-w-0 focus:outline-none no-scrollbar flex flex-col">
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
