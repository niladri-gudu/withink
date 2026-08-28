import type { ResolvedPlan } from "@/features/billing/config/plans";

/**
 * Single source of truth for the curated appearance catalog (themes,
 * typography, accent variants) and its tier gating.
 *
 * Mirrors internal-docs/MONETIZATION_PLAN.md §2 "Themes & typography":
 * Free keeps the standard Desk/Dusk world; Plus unlocks every curated
 * palette; Pro additionally unlocks curated font pairings and accent
 * variants. Update both together.
 *
 * The ids here MUST stay in sync with the allowlists in the pre-paint
 * inline script in app/src/app/layout.tsx and with the CSS selectors in
 * app/src/app/globals.css ([data-palette] / [data-font] / [data-accent]).
 */

export type PaletteId = "desk" | "vellum" | "indigo-nook" | "rosewood";

export type FontId = "alegreya" | "literata" | "editorial" | "codex" | "quill";

export type AccentId = "gold" | "oxblood" | "indigo-ink" | "moss";

/** Minimum plan that may SELECT the item (existing selections grandfather). */
export type AppearanceTier = ResolvedPlan;

const PLAN_RANK: Record<ResolvedPlan, number> = { free: 0, plus: 1, pro: 2 };

export function isTierUnlocked(
  minPlan: AppearanceTier,
  plan: ResolvedPlan,
): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

export interface PaletteOption {
  id: PaletteId;
  name: string;
  desc: string;
  minPlan: AppearanceTier;
  /** Hex previews for the picker card (documented swatch exception). */
  swatchLight: string;
  swatchDark: string;
  accentLight: string;
  accentDark: string;
  /**
   * Background hexes fed to the theme-color metas when the palette is
   * active (desktop value differs slightly from the marketing swatch).
   */
  metaLight: string;
  metaDark: string;
}

export const PALETTES: readonly PaletteOption[] = [
  {
    id: "desk",
    name: "Standard",
    desc: "The classic desk — manila day, umber night",
    minPlan: "free",
    swatchLight: "#EADFC7",
    swatchDark: "#33291C",
    accentLight: "#865901",
    accentDark: "#D3A056",
    metaLight: "#EEE5D6",
    metaDark: "#1E170F",
  },
  {
    id: "vellum",
    name: "Vellum",
    desc: "Sage ink on a green-tinted ledger",
    minPlan: "plus",
    swatchLight: "#EBEEE4",
    swatchDark: "#101911",
    accentLight: "#255D38",
    accentDark: "#8BC18C",
    metaLight: "#EBEEE4",
    metaDark: "#101911",
  },
  {
    id: "indigo-nook",
    name: "Indigo Nook",
    desc: "Iron-indigo ink on cool ivory",
    minPlan: "plus",
    swatchLight: "#E7EBF3",
    swatchDark: "#101622",
    accentLight: "#304989",
    accentDark: "#9CAEEE",
    metaLight: "#E7EBF3",
    metaDark: "#101622",
  },
  {
    id: "rosewood",
    name: "Rosewood",
    desc: "Mulberry ink on rose cream",
    minPlan: "plus",
    swatchLight: "#F5E8E5",
    swatchDark: "#1E1311",
    accentLight: "#7E3633",
    accentDark: "#E69688",
    metaLight: "#F5E8E5",
    metaDark: "#1E1311",
  },
] as const;

export interface FontOption {
  id: FontId;
  name: string;
  desc: string;
  minPlan: AppearanceTier;
}

export const FONTS: readonly FontOption[] = [
  {
    id: "alegreya",
    name: "Classic",
    desc: "The house serif — bookish and warm",
    minPlan: "free",
  },
  {
    id: "literata",
    name: "Literata",
    desc: "A reading serif cut for long nights",
    minPlan: "pro",
  },
  {
    id: "editorial",
    name: "Editorial",
    desc: "Clean Geist sans — crisp and modern",
    minPlan: "pro",
  },
  {
    id: "codex",
    name: "Codex",
    desc: "JetBrains Mono — for the meticulous writer",
    minPlan: "pro",
  },
  {
    id: "quill",
    name: "Quill",
    desc: "Fine Cormorant with a feathered hand",
    minPlan: "pro",
  },
] as const;

export interface AccentOption {
  id: AccentId;
  name: string;
  desc: string;
  minPlan: AppearanceTier;
  swatchLight: string;
  swatchDark: string;
}

export const ACCENTS: readonly AccentOption[] = [
  {
    id: "gold",
    name: "Antique Gold",
    desc: "The house accent — old-paper gold",
    minPlan: "free",
    swatchLight: "#865901",
    swatchDark: "#D3A056",
  },
  {
    id: "oxblood",
    name: "Oxblood",
    desc: "Dried-ink red",
    minPlan: "pro",
    swatchLight: "#7E3633",
    swatchDark: "#E69688",
  },
  {
    id: "indigo-ink",
    name: "Indigo Ink",
    desc: "Iron-blue fountain pen",
    minPlan: "pro",
    swatchLight: "#304989",
    swatchDark: "#9CAEEE",
  },
  {
    id: "moss",
    name: "Moss",
    desc: "Pressed botanical green",
    minPlan: "pro",
    swatchLight: "#255D38",
    swatchDark: "#8BC18C",
  },
] as const;

/** Persistence keys (localStorage, same precedent as withink-paper-scale). */
export const APPEARANCE_KEYS = {
  palette: "withink-palette",
  font: "withink-font",
  accent: "withink-accent",
} as const;

function getById<T extends { id: string }>(items: readonly T[], id: string) {
  return items.find((item) => item.id === id);
}

export function isPaletteId(value: string): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

export function isFontId(value: string): value is FontId {
  return FONTS.some((f) => f.id === value);
}

export function isAccentId(value: string): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}

export function getPalette(id: string): PaletteOption | undefined {
  return getById(PALETTES, id);
}

export function getFont(id: string): FontOption | undefined {
  return getById(FONTS, id);
}

export function getAccent(id: string): AccentOption | undefined {
  return getById(ACCENTS, id);
}

export function isPaletteUnlocked(id: string, plan: ResolvedPlan): boolean {
  const palette = getPalette(id);
  return palette ? isTierUnlocked(palette.minPlan, plan) : false;
}

export function isFontUnlocked(id: string, plan: ResolvedPlan): boolean {
  const font = getFont(id);
  return font ? isTierUnlocked(font.minPlan, plan) : false;
}

export function isAccentUnlocked(id: string, plan: ResolvedPlan): boolean {
  const accent = getAccent(id);
  return accent ? isTierUnlocked(accent.minPlan, plan) : false;
}
