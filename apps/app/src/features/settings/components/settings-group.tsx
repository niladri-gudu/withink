"use client";

import * as React from "react";
import { cn } from "@withink/utils";
import { ChevronDown } from "lucide-react";

interface SettingsGroupProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  /** Collapsed by default on phones (except Profile); always visible on lg+. */
  defaultOpen?: boolean;
  tone?: "default" | "danger";
}

/**
 * A settings group in the codex's ruled-section language. On phones each
 * group is an accessible disclosure (stateful trigger + animated reveal);
 * at lg+ the trigger becomes a static heading and the body is permanently
 * visible — pure CSS, no media-query JS, so SSR paints correctly on both.
 */
export function SettingsGroup({
  icon: Icon,
  title,
  description,
  children,
  defaultOpen = false,
  tone = "default",
}: SettingsGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const headerBadge = (
    <div
      className={cn(
        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
        tone === "danger"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-accent/25 bg-accent/10 text-accent",
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );

  const headerText = (
    <div className="min-w-0 flex-1 space-y-1">
      <h2 className={cn("text-h3", tone === "danger" && "text-destructive")}>
        {title}
      </h2>
      <p className="text-body-small text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <section
      className={cn(
        "border-border/60 border-t pt-6 pb-6 first:border-t-0 first:pt-0",
      )}
    >
      {/* Phone: stateful disclosure trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-4 text-left lg:hidden"
      >
        {headerBadge}
        {headerText}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-muted-foreground/60 mt-1 h-5 w-5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Desktop: static heading, body always open */}
      <div className="hidden items-start gap-4 text-left lg:flex">
        {headerBadge}
        {headerText}
      </div>

      {/* One body render, two visibility regimes */}
      <div
        className={cn(
          "mt-6 lg:mt-7 lg:block",
          open ? "animate-disclosure block" : "hidden",
        )}
      >
        {children}
      </div>
    </section>
  );
}
