"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { ThemeToggle } from "@withink/ui/theme-toggle";
import { Menu } from "lucide-react";

interface HeaderProps {
  onOpenMobile: () => void;
}

/**
 * Mobile-only running bar. On desktop the codex margin rail and each page's
 * running head carry all chrome, so this collapses to nothing there. On small
 * screens it is a slim band: menu, wordmark, theme.
 */
export function Header({ onOpenMobile }: HeaderProps) {
  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md select-none md:hidden sm:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted focus-visible:ring-ring h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-foreground font-serif text-lg font-bold tracking-tight">
          withink<span className="text-accent">.</span>
        </span>
      </div>

      <ThemeToggle />
    </header>
  );
}
