"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return match[2] ?? null;
  return null;
}

// Helper to get cookie domain
function getCookieDomain(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return "";
  }
  const parts = host.split(".");
  if (parts.length > 2) {
    const secondToLast = parts[parts.length - 2];
    if (secondToLast && ["com", "co", "org", "net", "edu", "gov"].includes(secondToLast) && parts.length > 3) {
      return `.${parts.slice(-3).join(".")}`;
    }
    return `.${parts.slice(-2).join(".")}`;
  }
  return `.${host}`;
}

// Helper to set cookie value
function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const domainString = domain ? `; domain=${domain}` : "";
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax${domainString}`;
}

function ThemeSync() {
  const { theme, setTheme } = useTheme();
  const lastThemeRef = React.useRef<string | undefined>(theme);

  // Sync theme changes to cookie
  React.useEffect(() => {
    if (theme) {
      setCookie("theme", theme);
      lastThemeRef.current = theme;
    }
  }, [theme]);

  // Read theme from cookie and sync back
  React.useEffect(() => {
    const syncFromCookie = () => {
      const cookieTheme = getCookie("theme");
      // Only update if cookieTheme exists, is valid, and is different from the current context theme
      if (
        cookieTheme &&
        (cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "system") &&
        cookieTheme !== lastThemeRef.current
      ) {
        lastThemeRef.current = cookieTheme;
        
        // Use View Transition if available to make it smooth
        const doc = document as Document & {
          startViewTransition?: (callback: () => void) => unknown;
        };
        if (
          doc.startViewTransition &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          doc.startViewTransition(() => {
            setTheme(cookieTheme);
          });
        } else {
          setTheme(cookieTheme);
        }
      }
    };

    // 1. Run once on mount to pick up any existing cookie
    syncFromCookie();

    // 2. Poll cookie every 1 second to keep side-by-side tabs in sync
    const interval = setInterval(syncFromCookie, 1000);

    // 3. Listen for window focus to update immediately when switching tabs
    window.addEventListener("focus", syncFromCookie);
    window.addEventListener("visibilitychange", syncFromCookie);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", syncFromCookie);
      window.removeEventListener("visibilitychange", syncFromCookie);
    };
  }, [setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={true}
      disableTransitionOnChange={false}
      {...props}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
