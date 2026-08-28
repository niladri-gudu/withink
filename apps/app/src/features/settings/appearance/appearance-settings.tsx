"use client";

import * as React from "react";
import { cn } from "@withink/utils";
import { Check, Lock, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  UpgradeDialog,
  type PaywallReason,
} from "@/features/billing/components/upgrade-dialog";
import type { ResolvedPlan } from "@/features/billing/config/plans";

import {
  ACCENTS,
  FONTS,
  isAccentUnlocked,
  isFontUnlocked,
  isPaletteUnlocked,
  PALETTES,
} from "./catalog";
import { useAppearance } from "./use-appearance";

/** Hairline divider between blocks living inside one group body. */
function GroupDivider() {
  return <div aria-hidden="true" className="border-border/40 my-7 border-t" />;
}

/**
 * The Appearance & paper feel body: day/night, curated paper worlds
 * (Plus), typography and accent ink (Pro). Selections persist locally and
 * are grandfathered — a locked card only blocks NEW selection.
 */
export function AppearanceSettings({ plan }: { plan: ResolvedPlan }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { palette, font, accent, setPalette, setFont, setAccent } =
    useAppearance();
  const [paywall, setPaywall] = React.useState<PaywallReason | null>(null);

  const modeActive = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <>
      {/* ---- Day / Night ---------------------------------------------- */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role="group"
        aria-label="Day or night"
      >
        {(
          [
            {
              id: "light" as const,
              name: "Day",
              desc: "Open the curtains",
              icon: Sun,
            },
            {
              id: "dark" as const,
              name: "Night",
              desc: "Dim the lamp",
              icon: Moon,
            },
          ] as const
        ).map((m) => {
          const active = modeActive === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setTheme(m.id)}
              aria-pressed={active}
              className={cn(
                "focus-visible:ring-ring flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-accent bg-accent/5 ring-accent/30 ring-1"
                  : "border-border hover:border-accent/50 hover:bg-secondary/40",
              )}
            >
              <m.icon className="text-muted-foreground h-4 w-4" />
              <div className="min-w-0 flex-1">
                <span className="text-title font-semibold">{m.name}</span>
                <p className="text-caption">{m.desc}</p>
              </div>
              {active && (
                <span className="bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <GroupDivider />

      {/* ---- Paper worlds (curated palettes; Plus unlocks the rest) ---- */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role="group"
        aria-label="Paper world"
      >
        {PALETTES.map((p) => {
          const active = palette === p.id;
          const unlocked = isPaletteUnlocked(p.id, plan);
          return (
            <button
              key={p.id}
              onClick={() =>
                unlocked ? setPalette(p.id) : setPaywall("themes")
              }
              aria-pressed={active}
              aria-label={
                unlocked
                  ? `${p.name} paper`
                  : `${p.name} paper — requires ${p.minPlan === "plus" ? "Plus" : "Pro"}`
              }
              className={cn(
                "focus-visible:ring-ring flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-accent bg-accent/5 ring-accent/30 ring-1"
                  : "border-border hover:border-accent/50 hover:bg-secondary/40",
              )}
            >
              {/* Dual-mode swatch: day half + night half, accent dot. */}
              <span className="border-border/60 flex h-12 w-12 shrink-0 overflow-hidden rounded-lg border">
                <span
                  className="flex h-full w-1/2 items-center justify-center"
                  style={{ backgroundColor: p.swatchLight }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.accentLight }}
                  />
                </span>
                <span
                  className="flex h-full w-1/2 items-center justify-center"
                  style={{ backgroundColor: p.swatchDark }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.accentDark }}
                  />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-title font-semibold">{p.name}</span>
                <p className="text-caption">{p.desc}</p>
              </div>
              {unlocked ? (
                active && (
                  <span className="bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )
              ) : (
                <span className="border-border bg-secondary/60 text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <GroupDivider />

      {/* ---- Typography (Pro) ------------------------------------------ */}
      <div className="space-y-3" role="group" aria-label="Typography">
        <p className="text-body-small text-foreground font-medium">Typeface</p>
        {FONTS.map((f) => {
          const active = font === f.id;
          const unlocked = isFontUnlocked(f.id, plan);
          const family =
            f.id === "alegreya"
              ? "var(--font-alegreya)"
              : f.id === "literata"
                ? "var(--font-literata)"
                : f.id === "editorial"
                  ? "var(--font-geist)"
                  : f.id === "codex"
                    ? "var(--font-jetbrains-mono)"
                    : "var(--font-cormorant)";
          return (
            <button
              key={f.id}
              onClick={() => (unlocked ? setFont(f.id) : setPaywall("fonts"))}
              aria-pressed={active}
              aria-label={
                unlocked
                  ? `${f.name} typeface`
                  : `${f.name} typeface — requires Pro`
              }
              className={cn(
                "focus-visible:ring-ring flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-accent bg-accent/5 ring-accent/30 ring-1"
                  : "border-border hover:border-accent/50 hover:bg-secondary/40",
              )}
            >
              <span
                className="text-h3 min-w-0 flex-1 truncate"
                style={{ fontFamily: family }}
              >
                {f.name}
              </span>
              <span className="text-caption hidden sm:block">{f.desc}</span>
              {unlocked ? (
                active && (
                  <span className="bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )
              ) : (
                <span className="border-border bg-secondary/60 text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <GroupDivider />

      {/* ---- Accent ink (Pro) ------------------------------------------- */}
      <div className="space-y-3" role="group" aria-label="Accent ink">
        <p className="text-body-small text-foreground font-medium">
          Accent ink
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = accent === a.id;
            const unlocked = isAccentUnlocked(a.id, plan);
            const dark = resolvedTheme === "dark";
            return (
              <button
                key={a.id}
                onClick={() =>
                  unlocked ? setAccent(a.id) : setPaywall("accents")
                }
                aria-pressed={active}
                aria-label={`${a.name} accent${unlocked ? "" : " — requires Pro"}`}
                title={unlocked ? a.name : `${a.name} · Pro`}
                className={cn(
                  "focus-visible:ring-ring flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  active
                    ? "border-foreground"
                    : "hover:border-border border-transparent",
                )}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: dark ? a.swatchDark : a.swatchLight,
                  }}
                >
                  {active && (
                    <Check
                      className="h-4 w-4 text-white drop-shadow-sm"
                      aria-hidden="true"
                    />
                  )}
                  {!unlocked && !active && (
                    <Lock
                      className="h-3.5 w-3.5 text-white drop-shadow-sm"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <UpgradeDialog
        open={paywall !== null}
        onOpenChange={(open) => {
          if (!open) setPaywall(null);
        }}
        reason={paywall ?? "themes"}
        plan={plan}
      />
    </>
  );
}
