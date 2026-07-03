import React from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppShell } from "@/features/app-shell/components/app-shell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <AppShell user={session?.user || null}>
      {children}
    </AppShell>
  );
}

