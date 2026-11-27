import { describe, expect, it } from "vitest";
import {
  ACCENTS,
  FONTS,
  PALETTES,
  isAccentUnlocked,
  isFontUnlocked,
  isPaletteId,
  isPaletteUnlocked,
  oklch,
  resolveAppearanceTheme,
  type AccentId,
  type PaletteId,
} from "@withink/tokens/native";

const PALETTE_IDS = PALETTES.map((palette) => palette.id) as PaletteId[];
const ACCENT_IDS = ACCENTS.map((accent) => accent.id) as AccentId[];

describe("shared appearance tokens", () => {
  it("converts OKLCH endpoints to pure black and white", () => {
    expect(oklch("oklch(1 0 0)")).toBe("#ffffff");
    expect(oklch("oklch(0 0 0)")).toBe("#000000");
  });

  it("keeps alpha in the rgba form", () => {
    expect(oklch("oklch(0 0 0 / 0.5)")).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("resolves every palette and accent pair to concrete colours", () => {
    for (const palette of PALETTE_IDS) {
      for (const accent of ACCENT_IDS) {
        for (const mode of ["light", "dark"] as const) {
          const tokens = resolveAppearanceTheme(palette, accent, mode);
          for (const value of [
            tokens.background,
            tokens.foreground,
            tokens.card,
            tokens.muted,
            tokens.accent,
            tokens.border,
            tokens.destructive,
          ]) {
            expect(value).toMatch(/^#[0-9a-f]{6}$/i);
          }
          for (const level of [1, 2, 3, 4, 5] as const) {
            expect(tokens.mood[level].solid).toMatch(/^#[0-9a-f]{6}$/i);
            expect(tokens.mood[level].background).toMatch(/^rgba\(/);
            expect(tokens.mood[level].border).toMatch(/^rgba\(/);
          }
        }
      }
    }
  });

  it("only changes the accent trio when the accent variant changes", () => {
    const gold = resolveAppearanceTheme("desk", "gold", "light");
    const moss = resolveAppearanceTheme("desk", "moss", "light");
    expect(moss.background).toBe(gold.background);
    expect(moss.foreground).toBe(gold.foreground);
    expect(moss.mood[3].solid).toBe(gold.mood[3].solid);
    expect(moss.accent).not.toBe(gold.accent);
    expect(moss.ring).toBe(moss.accent);
  });

  it("keeps the light and dark worlds distinct", () => {
    const light = resolveAppearanceTheme("desk", "gold", "light");
    const dark = resolveAppearanceTheme("desk", "gold", "dark");
    expect(light.background).not.toBe(dark.background);
    expect(light.foreground).not.toBe(dark.foreground);
  });

  it("gates the catalogue by plan", () => {
    expect(isPaletteUnlocked("desk", "free")).toBe(true);
    expect(isPaletteUnlocked("vellum", "free")).toBe(false);
    expect(isPaletteUnlocked("vellum", "plus")).toBe(true);
    expect(isFontUnlocked("alegreya", "free")).toBe(true);
    expect(isFontUnlocked("literata", "plus")).toBe(false);
    expect(isFontUnlocked("literata", "pro")).toBe(true);
    expect(isAccentUnlocked("gold", "free")).toBe(true);
    expect(isAccentUnlocked("moss", "plus")).toBe(false);
    for (const font of FONTS) {
      expect(isFontUnlocked(font.id, "pro")).toBe(true);
    }
  });

  it("rejects unknown palette ids", () => {
    expect(isPaletteId("desk")).toBe(true);
    expect(isPaletteId("midnight")).toBe(false);
  });
});
