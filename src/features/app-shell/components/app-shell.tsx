"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

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

  // Synchronize collapse state with localStorage on mount to prevent hydration flash
  React.useEffect(() => {
    const saved = localStorage.getItem("withink_sidebar_collapsed");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === "true");
    }
    setMounted(true);
  }, []);

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    localStorage.setItem("withink_sidebar_collapsed", String(nextCollapsed));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
        <main className="flex-1 overflow-y-auto min-w-0 focus:outline-none no-scrollbar flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
