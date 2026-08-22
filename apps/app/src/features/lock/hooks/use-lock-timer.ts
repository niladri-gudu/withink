import { useEffect } from "react";

interface UseLockTimerProps {
  isLockEnabled: boolean;
  timeoutMs: number;
  lockOnTabHide: boolean;
  isLocked: boolean;
  onLock: () => void;
}

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

/**
 * Auto-lock timer driven by a single 1s idle poll.
 *
 * The previous implementation re-armed a setTimeout on every activity event —
 * and `mousemove`/`scroll` fire at 60Hz+ — so the browser was continuously
 * clearing/re-creating timers on every page for the whole unlocked session.
 * This version records the last activity timestamp (a cheap assignment on each
 * event) and a single 1-second interval checks whether the idle threshold has
 * elapsed. The 1s poll granularity is negligible next to the (default 5-minute)
 * lock timeout, and `timeoutMs === 0` ("lock immediately") is handled directly.
 */
export function useLockTimer({
  isLockEnabled,
  timeoutMs,
  lockOnTabHide,
  isLocked,
  onLock,
}: UseLockTimerProps) {
  useEffect(() => {
    // If lock is disabled, or already locked, do not track activity.
    if (!isLockEnabled || isLocked) return;

    // timeoutMs < 0 means "never lock on inactivity" (e.g. -1): skip entirely.
    if (timeoutMs < 0) return;

    let lastActivity = Date.now();
    let interval: ReturnType<typeof setInterval> | null = null;

    const handleActivity = () => {
      if (document.visibilityState === "visible") {
        lastActivity = Date.now();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && lockOnTabHide) {
        onLock();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // "Lock immediately": a zero-delay timer fires on the next event-loop tick
    // unless an activity event arrives first.
    if (timeoutMs === 0) {
      const immediate = setTimeout(() => {
        if (Date.now() - lastActivity >= 0) onLock();
      }, 0);
      return () => {
        clearTimeout(immediate);
        ACTIVITY_EVENTS.forEach((event) =>
          window.removeEventListener(event, handleActivity),
        );
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    // Poll once per second and lock when the user has been idle past the timeout.
    interval = setInterval(() => {
      if (Date.now() - lastActivity >= timeoutMs) {
        onLock();
      }
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLockEnabled, timeoutMs, lockOnTabHide, isLocked, onLock]);
}