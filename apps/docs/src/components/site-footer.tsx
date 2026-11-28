import { Suspense } from "react";
import Link from "next/link";

import { FOOTER_NAV } from "@/config/site";

import { CurrentYear } from "./current-year";

const linkClass =
  "hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded px-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Shared Field Ledger footer. Stays a Server Component; the only
 * time-dependent value (the copyright year) is delegated to a tiny client
 * component so static prerender stays valid under Cache Components.
 */
export function SiteFooter() {
  return (
    <footer className="border-border/70 bg-background/60 border-t pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 font-serif text-xs sm:flex-row sm:gap-0 sm:px-6">
        <p className="order-2 text-center sm:order-1 sm:text-left">
          ©{" "}
          <Suspense fallback="…">
            <CurrentYear />
          </Suspense>{" "}
          withink. All rights reserved.
        </p>
        <nav aria-label="Footer" className="order-1 sm:order-2">
          <ul className="flex flex-wrap justify-center gap-x-2 gap-y-0 sm:gap-x-4">
            {FOOTER_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
