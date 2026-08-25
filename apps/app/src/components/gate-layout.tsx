"use client";

import * as React from "react";

interface GateLayoutProps {
  children: React.ReactNode;
  /** Attached to the card so focus-trapping gate screens can wrap the dialog. */
  containerRef?: React.Ref<HTMLElement>;
}

/**
 * Full-screen wrapper for the lock / setup gate screens. Mirrors the auth pages
 * (wordmark header above a login-style card on ruled ledger paper) so these
 * screens look identical to login/signup on every viewport. Scrolls vertically
 * instead of clipping when the card is taller than a short phone screen.
 */
export function GateLayout({ children, containerRef }: GateLayoutProps) {
  return (
    <div className="bg-background fixed inset-0 z-[9999] flex flex-col overflow-y-auto select-none">
      <div
        aria-hidden="true"
        className="ledger-rules pointer-events-none fixed inset-0"
      />
      <div className="relative m-auto w-full max-w-md px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-foreground font-serif text-3xl font-bold tracking-tight">
            withink<span className="text-accent">.</span>
          </span>
          <p className="text-muted-foreground/70 font-hand text-xl">
            the inside of your private notebook
          </p>
        </div>
        <div
          ref={containerRef as React.Ref<HTMLDivElement>}
          className="bg-card border-border/80 animate-in fade-in mt-6 w-full space-y-6 rounded-xl border p-6 shadow-sm duration-300 sm:space-y-8 sm:p-8"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
