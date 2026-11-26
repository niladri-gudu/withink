import type { MasterKey } from "./crypto";

/**
 * The unlocked master key, held only in memory for this app process.
 *
 * `DiaryScreen` writes it after unlock; the editor reads it while composing.
 * A cold start has no key and must unlock again. It is never persisted or
 * logged.
 */
let current: MasterKey | null = null;

export function setMasterKey(key: MasterKey): void {
  current = key;
}

export function getMasterKey(): MasterKey | null {
  return current;
}

export function clearMasterKey(): void {
  current = null;
}
