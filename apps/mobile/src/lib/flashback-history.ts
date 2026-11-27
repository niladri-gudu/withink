import * as SecureStore from "expo-secure-store";

import { FLASHBACK_HISTORY_LIMIT } from "@withink/core/flashback";

const KEY = "withink.flashback.history";

/**
 * Device-local "recently shown" list so the dashboard and the flashback page
 * never repeat a memory while unseen alternatives exist (web parity).
 */
export async function readFlashbackHistory(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export async function writeFlashbackHistory(history: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      KEY,
      JSON.stringify(history.slice(0, FLASHBACK_HISTORY_LIMIT)),
    );
  } catch {
    // A lost history only costs variety, never correctness.
  }
}
