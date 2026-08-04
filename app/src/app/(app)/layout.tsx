import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppShell } from "@/features/app-shell/components/app-shell";
import { SanctuaryLockGate } from "@/features/lock/components/sanctuary-lock-gate";
import { LockService } from "@/features/lock/services/lock-service";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const isUnlocked = await LockService.isSessionUnlocked(session.user.id, true);
    if (!isUnlocked) {
      return <SanctuaryLockGate userEmail={session.user.email} />;
    }
  }

  return (
    <AppShell user={session?.user || null} sessionUnlocked>
      {children}
    </AppShell>
  );
}

