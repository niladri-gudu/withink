import { useEffect, useRef } from "react";

interface UseLockTimerProps {
  isLockEnabled: boolean;
  timeoutMs: number;
  lockOnTabHide: boolean;
  isLocked: boolean;
  onLock: () => void;
}

export function useLockTimer({
  isLockEnabled,
  timeoutMs,
  lockOnTabHide,
  isLocked,
  onLock,
}: UseLockTimerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If lock is disabled, or already locked, do not run activity tracking
    if (!isLockEnabled || isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // timeoutMs < 0 means "never lock on inactivity" (e.g. -1): skip entirely.
      if (timeoutMs < 0) return;

      // timeoutMs === 0 means "lock immediately": a zero-delay timer fires on the
      // next event-loop tick unless an activity event resets it first.
      timerRef.current = setTimeout(() => {
        onLock();
      }, timeoutMs);
    };

    // Initialize timer on mount/update
    resetTimer();

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    
    const handleActivity = () => {
      // Only reset timer if the current tab is actually visible
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    // Bind event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (lockOnTabHide) {
          onLock();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLockEnabled, timeoutMs, lockOnTabHide, isLocked, onLock]);
}
