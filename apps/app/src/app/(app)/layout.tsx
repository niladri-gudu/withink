import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { AppShell } from "@/features/app-shell/components/app-shell";
import { LockService } from "@/features/lock/services/lock-service";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // The lock is enforced client-side by AppShell (and every server action /
  // route handler re-verifies isSessionUnlocked). Here we only seed the boot
  // state so users with a valid unlock cookie skip the lock overlay entirely.
  let sessionUnlocked = true;
  if (session?.user) {
    sessionUnlocked = await LockService.isSessionUnlocked(session.user.id, true);
  }

  return (
    <AppShell user={session?.user || null} sessionUnlocked={sessionUnlocked}>
      {children}
    </AppShell>
  );
}
