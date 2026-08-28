"use client";

import * as React from "react";

import { safeStorage } from "@/lib/safe-storage";

import {
  APPEARANCE_KEYS,
  getPalette,
  isAccentId,
  isFontId,
  isPaletteId,
  type AccentId,
  type FontId,
  type PaletteId,
} from "./catalog";

export interface AppearancePrefs {
  palette: PaletteId;
  font: FontId;
  accent: AccentId;
}

export const APPEARANCE_DEFAULTS: AppearancePrefs = {
  palette: "desk",
  font: "alegreya",
  accent: "gold",
};

type AttrMap = {
  [K in keyof AppearancePrefs]: { storageKey: string; attribute: string };
};

const ATTR_MAP: AttrMap = {
  palette: { storageKey: APPEARANCE_KEYS.palette, attribute: "data-palette" },
  font: { storageKey: APPEARANCE_KEYS.font, attribute: "data-font" },
  accent: { storageKey: APPEARANCE_KEYS.accent, attribute: "data-accent" },
};

function readStoredPref<K extends keyof AppearancePrefs>(
  key: K,
): AppearancePrefs[K] {
  const stored = safeStorage.getItem(ATTR_MAP[key].storageKey);
  if (stored === null) return APPEARANCE_DEFAULTS[key];
  const valid =
    key === "palette"
      ? isPaletteId(stored)
      : key === "font"
        ? isFontId(stored)
        : isAccentId(stored);
  return (valid ? stored : APPEARANCE_DEFAULTS[key]) as AppearancePrefs[K];
}

function applyAttribute(key: keyof AppearancePrefs, value: string): void {
  if (typeof document === "undefined") return;
  const { attribute } = ATTR_MAP[key];
  if (key === "accent") {
    // Gold is the default accent but still needs an explicit [data-accent]
    // rule to override a curated palette's own --accent. Always set it so
    // selecting gold (or any variant) beats the active palette consistently.
    document.documentElement.setAttribute(attribute, value);
    return;
  }
  if (value === APPEARANCE_DEFAULTS[key]) {
    // Defaults are the un-attrbuted base world in globals.css.
    document.documentElement.removeAttribute(attribute);
  } else {
    document.documentElement.setAttribute(attribute, value);
  }
}

function syncThemeColorMetas(palette: PaletteId): void {
  if (typeof document === "undefined") return;
  const option = getPalette(palette);
  if (!option) return;
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  for (const meta of metas) {
    if (meta.media.includes("dark")) {
      meta.setAttribute("content", option.metaDark);
    } else if (meta.media.includes("light")) {
      meta.setAttribute("content", option.metaLight);
    }
  }
}

/**
 * Client-side appearance preference store (localStorage, same precedent as
 * withink-paper-scale). The pre-paint inline script in layout.tsx applies
 * the stored data attributes before first paint; this hook re-reads the
 * same keys after hydration so the picker UI reflects them, and re-applies
 * on change. Cosmetic-only — no server action is involved, and selections
 * are grandfathered: nothing ever revokes a stored preference.
 */
export function useAppearance(): AppearancePrefs & {
  hydrated: boolean;
  setPalette: (id: PaletteId) => void;
  setFont: (id: FontId) => void;
  setAccent: (id: AccentId) => void;
} {
  const [prefs, setPrefs] =
    React.useState<AppearancePrefs>(APPEARANCE_DEFAULTS);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored: AppearancePrefs = {
      palette: readStoredPref("palette"),
      font: readStoredPref("font"),
      accent: readStoredPref("accent"),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe storage read (matches paper-scale pattern)
    setPrefs(stored);
    setHydrated(true);
  }, []);

  // Keep the browser-chrome color in step with the active palette.
  React.useEffect(() => {
    if (hydrated) syncThemeColorMetas(prefs.palette);
  }, [hydrated, prefs.palette]);

  const setPalette = (id: PaletteId) => {
    safeStorage.setItem(ATTR_MAP.palette.storageKey, id);
    applyAttribute("palette", id);
    setPrefs((prev) => ({ ...prev, palette: id }));
  };

  const setFont = (id: FontId) => {
    safeStorage.setItem(ATTR_MAP.font.storageKey, id);
    applyAttribute("font", id);
    setPrefs((prev) => ({ ...prev, font: id }));
  };

  const setAccent = (id: AccentId) => {
    safeStorage.setItem(ATTR_MAP.accent.storageKey, id);
    applyAttribute("accent", id);
    setPrefs((prev) => ({ ...prev, accent: id }));
  };

  return {
    ...prefs,
    hydrated,
    setPalette,
    setFont,
    setAccent,
  };
}
