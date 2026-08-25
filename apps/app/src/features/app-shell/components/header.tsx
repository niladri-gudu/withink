"use client";

import { ThemeToggle } from "@withink/ui/theme-toggle";

/**
 * Mobile-only running bar. The bottom tab bar owns navigation on phones, so
 * this is just the masthead: wordmark and theme. On desktop the codex margin
 * rail carries all chrome and this collapses to nothing.
 */
export function Header() {
  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md select-none sm:px-6 md:hidden">
      <span className="text-foreground font-serif text-lg font-bold tracking-tight">
        withink<span className="text-accent">.</span>
      </span>

      <ThemeToggle />
    </header>
  );
}
