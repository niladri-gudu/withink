import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useDebounce } from "./use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("should update value only after the specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 300 } }
    );

    expect(result.current).toBe("first");

    // Change value
    rerender({ value: "second", delay: 300 });
    expect(result.current).toBe("first"); // not updated yet

    // Advance halfway
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("first");

    // Advance to end of delay
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("second");
  });

  it("should reset timer if value changes before delay expires", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 300 } }
    );

    // Initial update
    rerender({ value: "second", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200); // 100ms left
    });
    expect(result.current).toBe("first");

    // Another update before previous timer completes
    rerender({ value: "third", delay: 300 });

    // Advance past original 300ms but not the new 300ms
    act(() => {
      vi.advanceTimersByTime(150); // 350ms total from start, but only 150ms from 'third'
    });
    expect(result.current).toBe("first"); // still 'first'

    // Advance enough to complete the second delay
    act(() => {
      vi.advanceTimersByTime(150); // 300ms from 'third'
    });
    expect(result.current).toBe("third");
  });
});
