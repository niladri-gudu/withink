import {
  FLASHBACK_HISTORY_LIMIT,
  selectLocalFlashback,
  type LocalFlashbackPick,
} from "@withink/core/flashback";

// The selection rule lives in `@withink/core` (shared with the native app).
// This module only owns the web's device-local persistence of it.
export { selectLocalFlashback };
export type { LocalFlashbackPick };

const HISTORY_KEY = "withink-flashback-history";

/** Non-secret, device-local "recently shown" list (mirrors the Redis one). */
export function readLocalFlashbackHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeLocalFlashbackHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, FLASHBACK_HISTORY_LIMIT)),
    );
  } catch {
    // Private mode / quota: history is an optimization, never a requirement.
  }
}
