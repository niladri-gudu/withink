/**
 * Mobile theme: the shared `@withink/tokens` palette/accent catalogue resolved
 * to concrete RN colours, plus the typography pairs the web offers.
 *
 * `theme.css` remains the web source of truth; values here come from the same
 * OKLCH table in `@withink/tokens/native`, so a palette change lands on both
 * clients at once.
 */

import '@/global.css';

import { Platform } from 'react-native';
import {
  resolveAppearanceTheme,
  type AccentId,
  type FontId,
  type PaletteId,
  type ThemeMode,
  type ThemeTokens,
} from '@withink/tokens/native';

export interface FontFamilies {
  sans: string;
  serif: string;
  mono: string;
  hand: string;
}

const SYSTEM_FONTS: FontFamilies = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    mono: 'Menlo',
    hand: 'Snell Roundhand',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    mono: 'var(--font-mono)',
    hand: 'var(--font-hand)',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    mono: 'monospace',
    hand: 'cursive',
  },
});

/**
 * Families are registered by `useAppFonts()` in the root layout. Until a
 * family finishes loading RN falls back to the platform default, so a missing
 * asset degrades rather than crashes.
 */
const FONT_FAMILIES: Record<FontId, FontFamilies> = {
  alegreya: {
    sans: 'Alegreya_400Regular',
    serif: 'Alegreya_400Regular',
    mono: 'Alegreya_400Regular',
    hand: 'Caveat_400Regular',
  },
  literata: {
    sans: 'Literata_400Regular',
    serif: 'Literata_400Regular',
    mono: 'Literata_400Regular',
    hand: 'Caveat_400Regular',
  },
  editorial: {
    sans: 'Geist_400Regular',
    serif: 'Geist_400Regular',
    mono: 'GeistMono_400Regular',
    hand: 'Caveat_400Regular',
  },
  codex: {
    sans: 'JetBrainsMono_400Regular',
    serif: 'JetBrainsMono_400Regular',
    mono: 'JetBrainsMono_400Regular',
    hand: 'Caveat_400Regular',
  },
  quill: {
    sans: 'CormorantGaramond_400Regular',
    serif: 'CormorantGaramond_400Regular',
    mono: 'CormorantGaramond_400Regular',
    hand: 'ShadowsIntoLight_400Regular',
  },
};

export function fontsFor(fontId: FontId): FontFamilies {
  return FONT_FAMILIES[fontId] ?? SYSTEM_FONTS;
}

export interface AppTheme extends ThemeTokens {
  /** Legacy aliases kept so existing screens keep reading the same keys. */
  text: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  tint: string;
  fonts: FontFamilies;
  /** Root font scale (web `--withink-paper-scale`), 0.8–1.2. */
  scale: number;
}

export function buildAppTheme(
  tokens: ThemeTokens,
  fontId: FontId,
  scale = 1,
): AppTheme {
  return {
    ...tokens,
    text: tokens.foreground,
    backgroundElement: tokens.muted,
    backgroundSelected: tokens.secondary,
    textSecondary: tokens.mutedForeground,
    tint: tokens.accent,
    fonts: fontsFor(fontId),
    scale,
  };
}

/** Static fallbacks for code outside the provider (e.g. navigation theme). */
export const Colors = {
  light: buildAppTheme(
    resolveAppearanceTheme('desk', 'gold', 'light'),
    'alegreya',
  ),
  dark: buildAppTheme(
    resolveAppearanceTheme('desk', 'gold', 'dark'),
    'alegreya',
  ),
} as const;

export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'textSecondary';

export const Fonts = SYSTEM_FONTS;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const TypeScale = {
  display: 48,
  title: 32,
  heading: 24,
  body: 16,
  small: 14,
  caption: 12,
  micro: 10,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export type { AccentId, FontId, PaletteId, ThemeMode };
