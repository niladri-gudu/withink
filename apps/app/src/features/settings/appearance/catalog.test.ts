import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ACCENTS,
  FONTS,
  isAccentId,
  isAccentUnlocked,
  isFontId,
  isFontUnlocked,
  isPaletteId,
  isPaletteUnlocked,
  isTierUnlocked,
  PALETTES,
} from "./catalog";

describe("appearance catalog — tier gating", () => {
  it("keeps the standard world free", () => {
    expect(isPaletteUnlocked("desk", "free")).toBe(true);
    expect(isFontUnlocked("alegreya", "free")).toBe(true);
    expect(isAccentUnlocked("gold", "free")).toBe(true);
  });

  it("gates curated palettes at Plus (all paid plans pass)", () => {
    for (const palette of PALETTES) {
      if (palette.minPlan === "free") continue;
      expect(isPaletteUnlocked(palette.id, "free")).toBe(false);
      expect(isPaletteUnlocked(palette.id, "plus")).toBe(true);
      expect(isPaletteUnlocked(palette.id, "pro")).toBe(true);
    }
  });

  it("gates typography and accents at Pro", () => {
    for (const font of FONTS) {
      if (font.minPlan === "free") continue;
      expect(isFontUnlocked(font.id, "free")).toBe(false);
      expect(isFontUnlocked(font.id, "plus")).toBe(false);
      expect(isFontUnlocked(font.id, "pro")).toBe(true);
    }
    for (const accent of ACCENTS) {
      if (accent.minPlan === "free") continue;
      expect(isAccentUnlocked(accent.id, "free")).toBe(false);
      expect(isAccentUnlocked(accent.id, "plus")).toBe(false);
      expect(isAccentUnlocked(accent.id, "pro")).toBe(true);
    }
  });

  it("ranks plans monotonically", () => {
    expect(isTierUnlocked("plus", "free")).toBe(false);
    expect(isTierUnlocked("plus", "plus")).toBe(true);
    expect(isTierUnlocked("pro", "plus")).toBe(false);
    expect(isTierUnlocked("pro", "pro")).toBe(true);
    expect(isTierUnlocked("free", "free")).toBe(true);
  });
});

describe("appearance catalog — validators", () => {
  it("accepts known ids and rejects everything else", () => {
    expect(isPaletteId("vellum")).toBe(true);
    expect(isPaletteId("dusk")).toBe(false);
    expect(isFontId("quill")).toBe(true);
    expect(isFontId("comic-sans")).toBe(false);
    expect(isAccentId("oxblood")).toBe(true);
    expect(isAccentId("gold")).toBe(true);
    expect(isAccentId("chartreuse")).toBe(false);
  });

  it("holds exactly one free default per axis", () => {
    expect(PALETTES.filter((p) => p.minPlan === "free")).toHaveLength(1);
    expect(FONTS.filter((f) => f.minPlan === "free")).toHaveLength(1);
    expect(ACCENTS.filter((a) => a.minPlan === "free")).toHaveLength(1);
  });
});

/**
 * Drift guard: the pre-paint inline script in layout.tsx hardcodes the
 * same id allowlists (it cannot import app modules). If this test fails,
 * update the arrays in the inline script — a stale allowlist would strip
 * a user's saved palette/font/accent on every load.
 */
describe("appearance catalog — inline script sync", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");

  it("keeps the layout.tsx allowlists in sync with the catalog", () => {
    const extract = (name: string) => {
      const match = layout.match(new RegExp(`var ${name} = \\[([^\\]]*)\\]`));
      const raw = match?.[1];
      if (!raw) throw new Error(`allowlist '${name}' missing in layout.tsx`);
      return raw
        .split(",")
        .map((s) => s.trim().replaceAll("'", ""))
        .filter(Boolean);
    };

    expect(extract("palettes")).toEqual(
      PALETTES.filter((p) => p.minPlan !== "free").map((p) => p.id),
    );
    expect(extract("fonts")).toEqual(
      FONTS.filter((f) => f.minPlan !== "free").map((f) => f.id),
    );
    expect(extract("accents")).toEqual(
      ACCENTS.filter((a) => a.minPlan !== "free").map((a) => a.id),
    );
  });
});
