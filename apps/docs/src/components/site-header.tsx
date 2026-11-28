import Link from "next/link";

import { Button } from "@withink/ui/button";
import { ThemeToggle } from "@withink/ui/theme-toggle";

import { appUrl, registerUrl } from "@/config/env";
import { PRIMARY_NAV } from "@/config/site";

const linkClass =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded px-2 font-serif text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

interface SiteHeaderProps {
  /** When true, the primary CTA opens the diary instead of the register flow. */
  hasSession?: boolean;
}

/** Shared Field Ledger header for the reading pages. Server component. */
export function SiteHeader({ hasSession = false }: SiteHeaderProps) {
  return (
    <header className="border-border/70 bg-background/85 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-foreground focus-visible:ring-ring rounded p-0.5 font-serif text-2xl font-bold tracking-tight select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          withink.
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
          <Button
            variant="default"
            asChild
            className="focus-visible:ring-ring h-11 rounded-xl px-4 font-serif text-xs font-medium tracking-[0.2em] uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:h-10"
          >
            <a href={hasSession ? appUrl() : registerUrl()}>
              {hasSession ? "Open diary" : "Open your diary"}
            </a>
          </Button>
        </div>
      </div>
      <nav
        aria-label="Primary menu"
        className="border-border/60 border-t md:hidden"
      >
        <ul className="mx-auto flex w-full max-w-5xl items-center gap-1 overflow-x-auto px-3">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClass}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
