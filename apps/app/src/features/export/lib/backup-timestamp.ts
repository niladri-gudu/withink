/** Non-secret, device-local record of the last successful archive download. */
const KEY = "withink-last-export-at";

/** Same-tab broadcast so the Settings card updates without a reload. */
export const BACKUP_RECORDED_EVENT = "withink:backup-recorded";

export function recordExportBackup(at: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(at));
    window.dispatchEvent(new Event(BACKUP_RECORDED_EVENT));
  } catch {
    // Private mode / quota: a missing timestamp only weakens a reminder.
  }
}

export function readLastExportAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
