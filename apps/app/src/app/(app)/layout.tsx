import { AppShell } from "@/features/app-shell/components/app-shell";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LockRepository } from "@/features/lock/repositories/lock-repository";
import { LockService } from "@/features/lock/services/lock-service";
import { getRequestSession } from "@/lib/request-cache";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getRequestSession();

  // The lock is enforced client-side by AppShell (and every server action /
  // route handler re-verifies isSessionUnlocked). Here we only seed the boot
  // state so users with a valid unlock cookie skip the lock overlay entirely.
  let sessionUnlocked = true;
  let lockSettings = null;
  let encryptionSettings = null;
  if (session?.user) {
    const userId = session.user.id;
    sessionUnlocked = await LockService.isSessionUnlocked(userId, true);
    const [lock, encryption] = await Promise.all([
      LockRepository.getSettings(userId),
      EncryptionSettingsRepository.getSettings(userId),
    ]);
    lockSettings = lock
      ? {
          isLockEnabled: lock.isLockEnabled,
          hasPasscode: !!lock.passcodeHash,
          autoLockTimeout: lock.autoLockTimeout,
          lockOnTabHide: lock.lockOnTabHide,
        }
      : null;
    encryptionSettings = encryption;
  }

  return (
    <AppShell
      user={session?.user || null}
      sessionUnlocked={sessionUnlocked}
      initialLockSettings={lockSettings}
      initialEncryptionSettings={encryptionSettings}
    >
      {children}
    </AppShell>
  );
}
