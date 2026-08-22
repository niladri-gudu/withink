import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

/**
 * Traps Tab/Shift+Tab focus within the attached container while `active`.
 *
 * The focusable list is computed once per activation (not on every Tab press) so
 * keyboard navigation never re-queries the DOM or forces layout inside a modal.
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => {
        // Filter out elements that are not visible or display none
        return !!(
          el.offsetWidth ||
          el.offsetHeight ||
          el.getClientRects().length
        );
      });
    };

    const focusableElements = getFocusableElements();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0]!;
      const lastElement = focusableElements[focusableElements.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Focus the first focusable element initially
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    if (focusableElements.length > 0) {
      focusTimer = setTimeout(() => {
        focusableElements[0]?.focus();
      }, 50);
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the previously active element
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