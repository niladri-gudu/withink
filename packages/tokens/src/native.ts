/**
 * The canonical appearance catalog and native token source.
 *
 * `theme.css` remains the web's ground truth for CSS. This module carries the
 * same values and ids so the Expo client can render the identical palettes,
 * accents and typography without a CSS engine. The web catalog re-exports
 * these ids/plans, so a new palette is added once.
 *
 * RN does not understand `oklch()`, so `resolveAppearanceTheme` converts the
 * shared OKLCH triples to sRGB at hand-off time.
 */

export type ThemeMode = "light" | "dark";

export type ResolvedPlan = "free" | "plus" | "pro";

/** Minimum plan that may SELECT the item (existing selections grandfather). */
export type AppearanceTier = ResolvedPlan;

export type PaletteId = "desk" | "vellum" | "indigo-nook" | "rosewood";
export type FontId = "alegreya" | "literata" | "editorial" | "codex" | "quill";
export type AccentId = "gold" | "oxblood" | "indigo-ink" | "moss";

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
  /** Background hexes for the web `theme-color` metas. */
  metaLight: string;
  metaDark: string;
}

export interface FontOption {
  id: FontId;
  name: string;
  desc: string;
  minPlan: AppearanceTier;
}

export interface AccentOption {
  id: AccentId;
  name: string;
  desc: string;
  minPlan: AppearanceTier;
  swatchLight: string;
  swatchDark: string;
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

/** Persistence keys (localStorage on web, SecureStore on native). */
export const APPEARANCE_KEYS = {
  palette: "withink-palette",
  font: "withink-font",
  accent: "withink-accent",
  scale: "withink-paper-scale",
} as const;

export function isPaletteId(value: string): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}

export function isFontId(value: string): value is FontId {
  return FONTS.some((font) => font.id === value);
}

export function isAccentId(value: string): value is AccentId {
  return ACCENTS.some((accent) => accent.id === value);
}

export function getPalette(id: string): PaletteOption | undefined {
  return PALETTES.find((palette) => palette.id === id);
}

export function getFont(id: string): FontOption | undefined {
  return FONTS.find((font) => font.id === id);
}

export function getAccent(id: string): AccentOption | undefined {
  return ACCENTS.find((accent) => accent.id === id);
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

/* ─── OKLCH → sRGB ─────────────────────────────────────────────────────── */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function gammaEncode(value: number): number {
  const x = clamp01(value);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** Converts an OKLCH triple to 0–255 sRGB channels. */
export function oklchToRgb(
  l: number,
  c: number,
  h: number,
): [number, number, number] {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime * lPrime * lPrime;
  const m3 = mPrime * mPrime * mPrime;
  const s3 = sPrime * sPrime * sPrime;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const blue = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return [
    Math.round(gammaEncode(r) * 255),
    Math.round(gammaEncode(g) * 255),
    Math.round(gammaEncode(blue) * 255),
  ];
}

/** `oklch(l c h)` or `oklch(l c h / alpha)` → `#rrggbb` / `rgba(r, g, b, a)`. */
export function oklch(value: string): string {
  const match = value.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/,
  );
  if (!match) {
    throw new Error(`Unsupported colour: ${value}`);
  }
  const [, l, c, h, alpha] = match;
  const [r, g, b] = oklchToRgb(Number(l), Number(c), Number(h));
  if (alpha === undefined) {
    return `#${[r, g, b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha)})`;
}

/* ─── Token values (mirrors globals.css) ───────────────────────────────── */

interface RawTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  mood: readonly [string, string, string, string, string];
  moodBg: readonly [string, string, string, string, string];
  moodBorder: readonly [string, string, string, string, string];
}

const DESK_LIGHT: RawTokens = {
  background: "oklch(0.98 0.015 76)",
  foreground: "oklch(0.24 0.03 55)",
  card: "oklch(0.99 0.005 76)",
  cardForeground: "oklch(0.24 0.03 55)",
  primary: "oklch(0.24 0.03 55)",
  primaryForeground: "oklch(0.98 0.015 76)",
  secondary: "oklch(0.94 0.015 76)",
  secondaryForeground: "oklch(0.24 0.03 55)",
  muted: "oklch(0.94 0.015 76)",
  mutedForeground: "oklch(0.45 0.02 60)",
  accent: "oklch(0.78 0.12 75)",
  accentForeground: "oklch(0.24 0.03 55)",
  destructive: "oklch(0.6 0.14 25)",
  destructiveForeground: "oklch(0.98 0.015 76)",
  border: "oklch(0.9 0.015 76)",
  input: "oklch(0.9 0.015 76)",
  ring: "oklch(0.24 0.03 55)",
  mood: [
    "oklch(0.38 0.08 55)",
    "oklch(0.43 0.075 62)",
    "oklch(0.48 0.07 70)",
    "oklch(0.54 0.075 75)",
    "oklch(0.7 0.1 75)",
  ],
  moodBg: [
    "oklch(0.38 0.08 55 / 0.1)",
    "oklch(0.43 0.075 62 / 0.1)",
    "oklch(0.48 0.07 70 / 0.12)",
    "oklch(0.54 0.075 75 / 0.12)",
    "oklch(0.7 0.1 75 / 0.16)",
  ],
  moodBorder: [
    "oklch(0.38 0.08 55 / 0.2)",
    "oklch(0.43 0.075 62 / 0.2)",
    "oklch(0.48 0.07 70 / 0.24)",
    "oklch(0.54 0.075 75 / 0.24)",
    "oklch(0.7 0.1 75 / 0.3)",
  ],
};

const DESK_DARK: RawTokens = {
  background: "oklch(0.18 0.01 70)",
  foreground: "oklch(0.92 0.01 75)",
  card: "oklch(0.22 0.01 70)",
  cardForeground: "oklch(0.92 0.01 75)",
  primary: "oklch(0.92 0.01 75)",
  primaryForeground: "oklch(0.18 0.01 70)",
  secondary: "oklch(0.25 0.01 70)",
  secondaryForeground: "oklch(0.92 0.01 75)",
  muted: "oklch(0.25 0.01 70)",
  mutedForeground: "oklch(0.65 0.01 75)",
  accent: "oklch(0.7 0.1 75)",
  accentForeground: "oklch(0.18 0.01 70)",
  destructive: "oklch(0.55 0.1 25)",
  destructiveForeground: "oklch(0.92 0.01 75)",
  border: "oklch(0.28 0.01 70)",
  input: "oklch(0.28 0.01 70)",
  ring: "oklch(0.92 0.01 75)",
  mood: [
    "oklch(0.72 0.06 60)",
    "oklch(0.76 0.065 65)",
    "oklch(0.8 0.07 70)",
    "oklch(0.84 0.085 73)",
    "oklch(0.9 0.09 76)",
  ],
  moodBg: [
    "oklch(0.72 0.06 60 / 0.14)",
    "oklch(0.76 0.065 65 / 0.14)",
    "oklch(0.8 0.07 70 / 0.15)",
    "oklch(0.84 0.085 73 / 0.16)",
    "oklch(0.9 0.09 76 / 0.2)",
  ],
  moodBorder: [
    "oklch(0.72 0.06 60 / 0.28)",
    "oklch(0.76 0.065 65 / 0.28)",
    "oklch(0.8 0.07 70 / 0.3)",
    "oklch(0.84 0.085 73 / 0.32)",
    "oklch(0.9 0.09 76 / 0.4)",
  ],
};

const VELLUM_LIGHT: RawTokens = {
  background: "oklch(0.945 0.014 120)",
  foreground: "oklch(0.27 0.025 150)",
  card: "oklch(0.965 0.01 120)",
  cardForeground: "oklch(0.27 0.025 150)",
  primary: "oklch(0.27 0.025 150)",
  primaryForeground: "oklch(0.965 0.01 120)",
  secondary: "oklch(0.915 0.016 125)",
  secondaryForeground: "oklch(0.27 0.025 150)",
  muted: "oklch(0.915 0.016 125)",
  mutedForeground: "oklch(0.46 0.022 148)",
  accent: "oklch(0.43 0.085 152)",
  accentForeground: "oklch(0.965 0.01 120)",
  destructive: "oklch(0.5 0.15 30)",
  destructiveForeground: "oklch(0.965 0.01 120)",
  border: "oklch(0.85 0.015 125)",
  input: "oklch(0.85 0.015 125)",
  ring: "oklch(0.43 0.085 152)",
  mood: [
    "oklch(0.36 0.05 148)",
    "oklch(0.41 0.055 150)",
    "oklch(0.47 0.06 152)",
    "oklch(0.53 0.065 155)",
    "oklch(0.7 0.09 158)",
  ],
  moodBg: [
    "oklch(0.36 0.05 148 / 0.12)",
    "oklch(0.41 0.055 150 / 0.12)",
    "oklch(0.47 0.06 152 / 0.14)",
    "oklch(0.53 0.065 155 / 0.14)",
    "oklch(0.7 0.09 158 / 0.18)",
  ],
  moodBorder: [
    "oklch(0.36 0.05 148 / 0.24)",
    "oklch(0.41 0.055 150 / 0.24)",
    "oklch(0.47 0.06 152 / 0.28)",
    "oklch(0.53 0.065 155 / 0.28)",
    "oklch(0.7 0.09 158 / 0.32)",
  ],
};

const VELLUM_DARK: RawTokens = {
  background: "oklch(0.2 0.02 150)",
  foreground: "oklch(0.91 0.015 125)",
  card: "oklch(0.245 0.018 150)",
  cardForeground: "oklch(0.91 0.015 125)",
  primary: "oklch(0.91 0.015 125)",
  primaryForeground: "oklch(0.2 0.02 150)",
  secondary: "oklch(0.3 0.016 150)",
  secondaryForeground: "oklch(0.91 0.015 125)",
  muted: "oklch(0.3 0.016 150)",
  mutedForeground: "oklch(0.67 0.02 140)",
  accent: "oklch(0.76 0.095 145)",
  accentForeground: "oklch(0.2 0.02 150)",
  destructive: "oklch(0.66 0.13 30)",
  destructiveForeground: "oklch(0.91 0.015 125)",
  border: "oklch(0.33 0.016 150)",
  input: "oklch(0.33 0.016 150)",
  ring: "oklch(0.76 0.095 145)",
  mood: [
    "oklch(0.74 0.04 148)",
    "oklch(0.78 0.045 150)",
    "oklch(0.82 0.05 152)",
    "oklch(0.86 0.055 155)",
    "oklch(0.9 0.07 158)",
  ],
  moodBg: [
    "oklch(0.74 0.04 148 / 0.16)",
    "oklch(0.78 0.045 150 / 0.16)",
    "oklch(0.82 0.05 152 / 0.18)",
    "oklch(0.86 0.055 155 / 0.18)",
    "oklch(0.9 0.07 158 / 0.22)",
  ],
  moodBorder: [
    "oklch(0.74 0.04 148 / 0.3)",
    "oklch(0.78 0.045 150 / 0.3)",
    "oklch(0.82 0.05 152 / 0.34)",
    "oklch(0.86 0.055 155 / 0.34)",
    "oklch(0.9 0.07 158 / 0.42)",
  ],
};

const INDIGO_LIGHT: RawTokens = {
  background: "oklch(0.94 0.012 260)",
  foreground: "oklch(0.27 0.03 265)",
  card: "oklch(0.962 0.008 260)",
  cardForeground: "oklch(0.27 0.03 265)",
  primary: "oklch(0.27 0.03 265)",
  primaryForeground: "oklch(0.962 0.008 260)",
  secondary: "oklch(0.915 0.014 262)",
  secondaryForeground: "oklch(0.27 0.03 265)",
  muted: "oklch(0.915 0.014 262)",
  mutedForeground: "oklch(0.46 0.025 265)",
  accent: "oklch(0.42 0.11 266)",
  accentForeground: "oklch(0.962 0.008 260)",
  destructive: "oklch(0.5 0.15 30)",
  destructiveForeground: "oklch(0.962 0.008 260)",
  border: "oklch(0.845 0.014 262)",
  input: "oklch(0.845 0.014 262)",
  ring: "oklch(0.42 0.11 266)",
  mood: [
    "oklch(0.36 0.06 264)",
    "oklch(0.41 0.065 266)",
    "oklch(0.47 0.07 268)",
    "oklch(0.53 0.075 270)",
    "oklch(0.7 0.095 272)",
  ],
  moodBg: [
    "oklch(0.36 0.06 264 / 0.12)",
    "oklch(0.41 0.065 266 / 0.12)",
    "oklch(0.47 0.07 268 / 0.14)",
    "oklch(0.53 0.075 270 / 0.14)",
    "oklch(0.7 0.095 272 / 0.18)",
  ],
  moodBorder: [
    "oklch(0.36 0.06 264 / 0.24)",
    "oklch(0.41 0.065 266 / 0.24)",
    "oklch(0.47 0.07 268 / 0.28)",
    "oklch(0.53 0.075 270 / 0.28)",
    "oklch(0.7 0.095 272 / 0.32)",
  ],
};

const INDIGO_DARK: RawTokens = {
  background: "oklch(0.2 0.025 265)",
  foreground: "oklch(0.91 0.015 265)",
  card: "oklch(0.245 0.022 265)",
  cardForeground: "oklch(0.91 0.015 265)",
  primary: "oklch(0.91 0.015 265)",
  primaryForeground: "oklch(0.2 0.025 265)",
  secondary: "oklch(0.3 0.02 265)",
  secondaryForeground: "oklch(0.91 0.015 265)",
  muted: "oklch(0.3 0.02 265)",
  mutedForeground: "oklch(0.68 0.02 268)",
  accent: "oklch(0.76 0.095 272)",
  accentForeground: "oklch(0.2 0.025 265)",
  destructive: "oklch(0.66 0.13 30)",
  destructiveForeground: "oklch(0.91 0.015 265)",
  border: "oklch(0.33 0.02 265)",
  input: "oklch(0.33 0.02 265)",
  ring: "oklch(0.76 0.095 272)",
  mood: [
    "oklch(0.74 0.05 266)",
    "oklch(0.78 0.055 268)",
    "oklch(0.82 0.06 270)",
    "oklch(0.86 0.07 272)",
    "oklch(0.9 0.085 274)",
  ],
  moodBg: [
    "oklch(0.74 0.05 266 / 0.16)",
    "oklch(0.78 0.055 268 / 0.16)",
    "oklch(0.82 0.06 270 / 0.18)",
    "oklch(0.86 0.07 272 / 0.18)",
    "oklch(0.9 0.085 274 / 0.22)",
  ],
  moodBorder: [
    "oklch(0.74 0.05 266 / 0.3)",
    "oklch(0.78 0.055 268 / 0.3)",
    "oklch(0.82 0.06 270 / 0.34)",
    "oklch(0.86 0.07 272 / 0.34)",
    "oklch(0.9 0.085 274 / 0.42)",
  ],
};

const ROSEWOOD_LIGHT: RawTokens = {
  background: "oklch(0.94 0.015 30)",
  foreground: "oklch(0.26 0.028 25)",
  card: "oklch(0.962 0.01 30)",
  cardForeground: "oklch(0.26 0.028 25)",
  primary: "oklch(0.26 0.028 25)",
  primaryForeground: "oklch(0.962 0.01 30)",
  secondary: "oklch(0.91 0.017 32)",
  secondaryForeground: "oklch(0.26 0.028 25)",
  muted: "oklch(0.91 0.017 32)",
  mutedForeground: "oklch(0.45 0.025 25)",
  accent: "oklch(0.43 0.1 25)",
  accentForeground: "oklch(0.962 0.01 30)",
  destructive: "oklch(0.5 0.15 30)",
  destructiveForeground: "oklch(0.962 0.01 30)",
  border: "oklch(0.845 0.016 32)",
  input: "oklch(0.845 0.016 32)",
  ring: "oklch(0.43 0.1 25)",
  mood: [
    "oklch(0.36 0.06 22)",
    "oklch(0.41 0.065 24)",
    "oklch(0.47 0.07 26)",
    "oklch(0.53 0.075 28)",
    "oklch(0.7 0.095 30)",
  ],
  moodBg: [
    "oklch(0.36 0.06 22 / 0.12)",
    "oklch(0.41 0.065 24 / 0.12)",
    "oklch(0.47 0.07 26 / 0.14)",
    "oklch(0.53 0.075 28 / 0.14)",
    "oklch(0.7 0.095 30 / 0.18)",
  ],
  moodBorder: [
    "oklch(0.36 0.06 22 / 0.24)",
    "oklch(0.41 0.065 24 / 0.24)",
    "oklch(0.47 0.07 26 / 0.28)",
    "oklch(0.53 0.075 28 / 0.28)",
    "oklch(0.7 0.095 30 / 0.32)",
  ],
};

const ROSEWOOD_DARK: RawTokens = {
  background: "oklch(0.2 0.02 25)",
  foreground: "oklch(0.91 0.015 28)",
  card: "oklch(0.245 0.018 25)",
  cardForeground: "oklch(0.91 0.015 28)",
  primary: "oklch(0.91 0.015 28)",
  primaryForeground: "oklch(0.2 0.02 25)",
  secondary: "oklch(0.3 0.016 25)",
  secondaryForeground: "oklch(0.91 0.015 28)",
  muted: "oklch(0.3 0.016 25)",
  mutedForeground: "oklch(0.68 0.018 28)",
  accent: "oklch(0.75 0.1 30)",
  accentForeground: "oklch(0.2 0.02 25)",
  destructive: "oklch(0.66 0.13 30)",
  destructiveForeground: "oklch(0.91 0.015 28)",
  border: "oklch(0.33 0.016 25)",
  input: "oklch(0.33 0.016 25)",
  ring: "oklch(0.75 0.1 30)",
  mood: [
    "oklch(0.74 0.05 24)",
    "oklch(0.78 0.055 26)",
    "oklch(0.82 0.06 28)",
    "oklch(0.86 0.07 30)",
    "oklch(0.9 0.085 32)",
  ],
  moodBg: [
    "oklch(0.74 0.05 24 / 0.16)",
    "oklch(0.78 0.055 26 / 0.16)",
    "oklch(0.82 0.06 28 / 0.18)",
    "oklch(0.86 0.07 30 / 0.18)",
    "oklch(0.9 0.085 32 / 0.22)",
  ],
  moodBorder: [
    "oklch(0.74 0.05 24 / 0.3)",
    "oklch(0.78 0.055 26 / 0.3)",
    "oklch(0.82 0.06 28 / 0.34)",
    "oklch(0.86 0.07 30 / 0.34)",
    "oklch(0.9 0.085 32 / 0.42)",
  ],
};

const RAW_PALETTES: Record<PaletteId, Record<ThemeMode, RawTokens>> = {
  desk: { light: DESK_LIGHT, dark: DESK_DARK },
  vellum: { light: VELLUM_LIGHT, dark: VELLUM_DARK },
  "indigo-nook": { light: INDIGO_LIGHT, dark: INDIGO_DARK },
  rosewood: { light: ROSEWOOD_LIGHT, dark: ROSEWOOD_DARK },
};

/** Accent overrides mirror `[data-accent]`; only accent + ring change. */
const RAW_ACCENTS: Record<AccentId, Record<ThemeMode, string>> = {
  gold: { light: "oklch(0.5 0.105 75)", dark: "oklch(0.74 0.11 75)" },
  oxblood: { light: "oklch(0.45 0.11 25)", dark: "oklch(0.75 0.1 28)" },
  "indigo-ink": { light: "oklch(0.44 0.1 265)", dark: "oklch(0.76 0.09 270)" },
  moss: { light: "oklch(0.44 0.08 152)", dark: "oklch(0.76 0.09 150)" },
};

export interface MoodTokens {
  solid: string;
  background: string;
  border: string;
}

export interface ThemeTokens {
  mode: ThemeMode;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  mood: Record<1 | 2 | 3 | 4 | 5, MoodTokens>;
}

/** Resolves a palette + accent pair into concrete RN colours. */
export function resolveAppearanceTheme(
  paletteId: PaletteId,
  accentId: AccentId,
  mode: ThemeMode,
): ThemeTokens {
  const raw = RAW_PALETTES[paletteId][mode];
  const accent = oklch(RAW_ACCENTS[accentId][mode]);
  const moods = [1, 2, 3, 4, 5] as const;
  return {
    mode,
    background: oklch(raw.background),
    foreground: oklch(raw.foreground),
    card: oklch(raw.card),
    cardForeground: oklch(raw.cardForeground),
    primary: oklch(raw.primary),
    primaryForeground: oklch(raw.primaryForeground),
    secondary: oklch(raw.secondary),
    secondaryForeground: oklch(raw.secondaryForeground),
    muted: oklch(raw.muted),
    mutedForeground: oklch(raw.mutedForeground),
    accent,
    accentForeground: oklch(raw.accentForeground),
    destructive: oklch(raw.destructive),
    destructiveForeground: oklch(raw.destructiveForeground),
    border: oklch(raw.border),
    input: oklch(raw.input),
    ring: accent,
    mood: Object.fromEntries(
      moods.map((level, index) => [
        level,
        {
          solid: oklch(raw.mood[index]!),
          background: oklch(raw.moodBg[index]!),
          border: oklch(raw.moodBorder[index]!),
        },
      ]),
    ) as ThemeTokens["mood"],
  };
}

/** The editor's six-colour theme, derived from the semantic tokens. */
export function editorThemeFromTokens(tokens: ThemeTokens) {
  return {
    text: tokens.foreground,
    background: tokens.background,
    muted: tokens.mutedForeground,
    accent: tokens.accent,
    border: tokens.border,
    codeBackground: tokens.muted,
  };
}
