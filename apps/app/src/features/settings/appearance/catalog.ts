/**
 * Curated appearance catalog — now owned by `@withink/tokens/native` so the
 * web and Expo clients read one source. This module keeps the app-facing
 * type aliases and re-exports, preserving every existing import.
 *
 * The ids MUST stay in sync with the pre-paint allowlists in `layout.tsx` and
 * the CSS selectors in `globals.css`; `@withink/tokens` owns the values.
 */

import {
  ACCENTS,
  APPEARANCE_KEYS,
  FONTS,
  getAccent,
  getFont,
  getPalette,
  isAccentId,
  isAccentUnlocked,
  isFontId,
  isFontUnlocked,
  isPaletteId,
  isPaletteUnlocked,
  isTierUnlocked,
  PALETTES,
  type AccentId,
  type AccentOption,
  type AppearanceTier,
  type FontId,
  type FontOption,
  type PaletteId,
  type PaletteOption,
} from "@withink/tokens/native";

import type { ResolvedPlan } from "@/features/billing/config/plans";

export {
  ACCENTS,
  APPEARANCE_KEYS,
  FONTS,
  PALETTES,
  getAccent,
  getFont,
  getPalette,
  isAccentId,
  isAccentUnlocked,
  isFontId,
  isFontUnlocked,
  isPaletteId,
  isPaletteUnlocked,
  isTierUnlocked,
};

export type {
  AccentId,
  AccentOption,
  AppearanceTier,
  FontId,
  FontOption,
  PaletteId,
  PaletteOption,
};

export type AppearancePlan = ResolvedPlan;
