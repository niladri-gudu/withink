/**
 * Pure calendar rules for letters to the future self.
 *
 * No imports, no server-only, no side effects: every decision that bends
 * letter behavior lives here so it can be unit-tested exhaustively and can
 * never drift between server actions and UI. Dates are viewer-local
 * YYYY-MM-DD strings resolved exactly like journal dates (withink-local-date
 * cookie → server fallback).
 */

/** A letter is delivered on its unlock date and forever after. */
export function isDelivered(unlockDate: string, today: string): boolean {
  return unlockDate <= today;
}

/** Occupies one of the plan's active slots (delivered letters free theirs). */
export function occupiesSlot(unlockDate: string, today: string): boolean {
  return !isDelivered(unlockDate, today);
}

export interface LetterCountdown {
  /** "opens today" | "opens tomorrow" | "opens Aug 30, 2026" */
  label: string;
  daysAway: number;
}

/** Human hand-note for a sealed letter, computed from plain date strings. */
export function countdownFor(
  unlockDate: string,
  today: string,
): LetterCountdown {
  if (isDelivered(unlockDate, today)) {
    return { label: "opened", daysAway: 0 };
  }
  const msPerDay = 86_400_000;
  // Date.parse of YYYY-MM-DD is UTC-anchored on both sides; equal offsets
  // cancel out, so whole-day arithmetic over local semantics stays exact.
  const daysAway = Math.round(
    (Date.parse(`${unlockDate}T00:00:00Z`) -
      Date.parse(`${today}T00:00:00Z`)) /
      msPerDay,
  );
  if (daysAway === 1) return { label: "opens tomorrow", daysAway };
  if (daysAway <= 28) {
    return { label: `opens in ${daysAway} days`, daysAway };
  }
  const pretty = new Date(`${unlockDate}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
  return { label: `opens ${pretty}`, daysAway };
}
