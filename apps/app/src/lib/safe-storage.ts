/**
 * Storage access that never throws. Private-browsing modes, quota policies,
 * and blocked partitions make raw localStorage/sessionStorage access throw;
 * shell-level reads during render would otherwise crash the whole route.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Quota exceeded or storage blocked — the setting is best-effort.
    }
  },

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },

  getSessionItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  removeSessionItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};
