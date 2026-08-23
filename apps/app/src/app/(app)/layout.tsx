import { getRequestLockSettings, getRequestSession } from "@/lib/request-cache";
import { AppShell } from "@/features/app-shell/components/app-shell";
import { LockedContentPlaceholder } from "@/features/app-shell/components/locked-content-placeholder";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LockService } from "@/features/lock/services/lock-service";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getRequestSession();

  // Server-side lock verification: locked sessions never receive page content.
  // The client lock overlay (rendered by AppShell) provides the interactive
  // unlock experience on top of this gate.
  let sessionUnlocked = true;
  let lockSettings = null;
  let encryptionSettings = null;
  if (session?.user) {
    const userId = session.user.id;

    // Read lock settings once (per-request cache) and hand them to
    // isSessionUnlocked so the layout doesn't hit Redis twice.
    const lock = await getRequestLockSettings(userId);
    lockSettings = lock
      ? {
          isLockEnabled: lock.isLockEnabled,
          hasPasscode: !!lock.passcodeHash,
          autoLockTimeout: lock.autoLockTimeout,
          lockOnTabHide: lock.lockOnTabHide,
        }
      : null;

    const [unlocked, encryption] = await Promise.all([
      LockService.isSessionUnlocked(userId, true, lock),
      EncryptionSettingsRepository.getSettings(userId),
    ]);
    sessionUnlocked = unlocked;
    encryptionSettings = encryption;
  }

  // The lock is enforced server-side too: while the session is locked, page
  // content is never streamed — locked sessions get a placeholder (the client
  // lock overlay covers it). After an unlock, AppShell refreshes so real
  // content replaces the placeholder without a full reload.
  const isLocked = !!session?.user && !sessionUnlocked;

  return (
    <AppShell
      user={session?.user || null}
      sessionUnlocked={sessionUnlocked}
      initialLockSettings={lockSettings}
      initialEncryptionSettings={encryptionSettings}
    >
      {isLocked ? <LockedContentPlaceholder /> : children}
    </AppShell>
  );
}
