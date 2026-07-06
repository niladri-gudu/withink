import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

// Helper component to test the focus trap hook
function FocusTrapTestComponent({ active }: { active: boolean }) {
  const containerRef = useFocusTrap(active);
  return (
    <div>
      <button data-testid="outside-button">Outside</button>
      <div ref={containerRef as any} data-testid="trap-container">
        <input data-testid="input-1" placeholder="First focusable" />
        <button data-testid="button-1">Second focusable</button>
        <textarea data-testid="textarea-1" placeholder="Third focusable" />
      </div>
    </div>
  );
}

describe("useFocusTrap", () => {
  let originalOffsetWidth: PropertyDescriptor | undefined;
  let originalOffsetHeight: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();

    // Stub offsetWidth and offsetHeight in jsdom so elements are considered visible by the hook
    originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      value: 50,
    });
  });

  afterEach(() => {
    vi.useRealTimers();

    // Restore original property descriptors
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    }
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
    }
  });

  it("should focus the first focusable element when activated", () => {
    render(<FocusTrapTestComponent active={true} />);

    // Fast-forward initial auto-focus timer inside hook
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const firstInput = screen.getByTestId("input-1");
    expect(document.activeElement).toBe(firstInput);
  });

  it("should trap focus inside the container when Tab is pressed on the last focusable element", () => {
    render(<FocusTrapTestComponent active={true} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const firstInput = screen.getByTestId("input-1");
    const thirdTextarea = screen.getByTestId("textarea-1");

    // Focus last element
    act(() => {
      thirdTextarea.focus();
    });
    expect(document.activeElement).toBe(thirdTextarea);

    // Simulate Tab keypress
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    act(() => {
      window.dispatchEvent(tabEvent);
    });

    expect(document.activeElement).toBe(firstInput);
  });

  it("should trap focus inside the container when Shift+Tab is pressed on the first focusable element", () => {
    render(<FocusTrapTestComponent active={true} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const firstInput = screen.getByTestId("input-1");
    const thirdTextarea = screen.getByTestId("textarea-1");

    expect(document.activeElement).toBe(firstInput);

    // Simulate Shift+Tab keypress on the first element
    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    act(() => {
      window.dispatchEvent(shiftTabEvent);
    });

    expect(document.activeElement).toBe(thirdTextarea);
  });

  it("should restore focus to the previously active element when deactivated", () => {
    // Render and focus an element outside of the hook container first
    const outsideBtn = document.createElement("button");
    document.body.appendChild(outsideBtn);
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);

    const { rerender } = render(<FocusTrapTestComponent active={true} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // When trap is active, focus moves into the trap
    expect(document.activeElement).not.toBe(outsideBtn);

    // Deactivate the focus trap
    rerender(<FocusTrapTestComponent active={false} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Focus should be restored back to outsideBtn
    expect(document.activeElement).toBe(outsideBtn);

    document.body.removeChild(outsideBtn);
  });
});
