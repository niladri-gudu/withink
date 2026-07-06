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

  return (
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
  );
}
