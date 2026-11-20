import { Suspense } from "react";
import { cookies } from "next/headers";

import {
  getRequestEncryptionSettings,
  getRequestLockSettings,
  getRequestSession,
} from "@/lib/request-cache";
import { getServerToday } from "@/lib/viewer-today";
import { AppShell } from "@/features/app-shell/components/app-shell";
import { AppShellSkeleton } from "@/features/app-shell/components/app-shell-skeleton";
import { LocalAppShell } from "@/features/app-shell/components/local-app-shell";
import { LockedContentPlaceholder } from "@/features/app-shell/components/locked-content-placeholder";
import { LockService } from "@/features/lock/services/lock-service";
import { ProfileSeeder } from "@/features/profile/profile-seeder";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface LockSeed {
  isLockEnabled: boolean;
  hasPasscode: boolean;
  autoLockTimeout: number;
  lockOnTabHide: boolean;
}

interface EncryptionSeed {
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
  kdfIterations?: number;
}

/**
 * The layout itself is synchronous, so the shell fallback paints immediately.
 *
 * Session/lock/encryption resolution happens in `AppGate` behind Suspense.
 * That removes the single blocking await that previously sat above every
 * `(app)` route (see `internal-docs/LOCAL_FIRST_PLAN.md` §3) without weakening
 * the gate: `AppGate` still renders `children` only after the server-side
 * unlock check, so a locked session never receives page content.
 */
export default async function AppLayout({ children }: AppLayoutProps) {
  // Non-sensitive hint, set on-device by ProfileSeeder for ZK accounts. It is
  // safe to skip the server gate only because ZK RSC content is ciphertext;
  // anything without the hint (legacy plaintext, first visit) keeps the gate.
  const zkHint = !!(await cookies()).get("withink-zk")?.value;

  if (zkHint) {
    return <LocalAppShell>{children}</LocalAppShell>;
  }

  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppGate>{children}</AppGate>
    </Suspense>
  );
}

async function AppGate({ children }: AppLayoutProps) {
  const session = await getRequestSession();

  // Server-side lock verification: locked sessions never receive page content.
  // The client lock overlay (rendered by AppShell) provides the interactive
  // unlock experience on top of this gate.
  let sessionUnlocked = true;
  let lockSettings: LockSeed | null = null;
  let encryptionSettings: EncryptionSeed | null = null;
  if (session?.user) {
    const userId = session.user.id;

    // Start both per-request-cached reads together: lock and encryption are
    // separate Redis keys, so serializing them added a full round-trip to the
    // critical path. The unlock check needs the lock settings, so it runs
    // after they resolve.
    const [lock, encryption] = await Promise.all([
      getRequestLockSettings(userId),
      getRequestEncryptionSettings(userId),
    ]);
    lockSettings = lock
      ? {
          isLockEnabled: lock.isLockEnabled,
          hasPasscode: !!lock.passcodeHash,
          autoLockTimeout: lock.autoLockTimeout,
          lockOnTabHide: lock.lockOnTabHide,
        }
      : null;

    sessionUnlocked = await LockService.isSessionUnlocked(userId, true, lock);
    encryptionSettings = encryption;
  }

  // The lock is enforced server-side too: while the session is locked, page
  // content is never streamed — locked sessions get a placeholder (the client
  // lock overlay covers it). After an unlock, AppShell refreshes so real
  // content replaces the placeholder without a full reload.
  const isLocked = !!session?.user && !sessionUnlocked;

  // Cache the authoritative settings on-device for the next boot. E4b will
  // read this profile (plus the withink-zk hint cookie) to gate the shell
  // without a server round-trip; nothing here changes the current gate.
  const profileEncryption = {
    isClientEncrypted: encryptionSettings?.isClientEncrypted ?? false,
    encryptionSalt: encryptionSettings?.encryptionSalt ?? "",
    verificationCiphertext: encryptionSettings?.verificationCiphertext ?? "",
    kdfIterations: encryptionSettings?.kdfIterations ?? 0,
  };
  const profileLock = lockSettings ?? {
    isLockEnabled: false,
    hasPasscode: false,
    autoLockTimeout: 0,
    lockOnTabHide: false,
  };
  const profileUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <AppShell
      user={session?.user || null}
      sessionUnlocked={sessionUnlocked}
      initialLockSettings={lockSettings}
      initialEncryptionSettings={encryptionSettings}
      serverToday={getServerToday()}
    >
      <ProfileSeeder
        accountId={session?.user.id ?? null}
        user={profileUser}
        encryption={profileEncryption}
        lock={profileLock}
      />
      {isLocked ? <LockedContentPlaceholder /> : children}
    </AppShell>
  );
}
