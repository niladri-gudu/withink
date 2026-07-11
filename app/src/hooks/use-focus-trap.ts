import { useEffect, useRef } from "react";

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save current active element to restore later
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Find all focusable elements
    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => {
        // Filter out elements that are not visible or display none
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
    };

    // Focus the first focusable element initially
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      const timer = setTimeout(() => {
        focusableElements[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0]!;
      const lastElement = focusableElements[focusableElements.length - 1]!;

      if (e.shiftKey) {
        // Shift + Tab: Go to the last element if focus is on the first
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: Go to the first element if focus is on the last
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to previously active element
      if (previousActiveElementRef.current) {
        // Small delay to prevent issues with state updates
        const restoreEl = previousActiveElementRef.current;
        setTimeout(() => {
          restoreEl.focus();
        }, 50);
      }
    };
  }, [active]);

  return containerRef;
}
