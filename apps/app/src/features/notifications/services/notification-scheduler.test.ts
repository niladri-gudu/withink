import { describe, expect, it } from "vitest";

import { parseReminderTime, resolveLocalClock } from "./notification-scheduler";

describe("resolveLocalClock", () => {
  it("rolls into the next local day for a negative (east) offset", () => {
    // India: getTimezoneOffset() === -330. 18:30Z → 00:00 next day.
    const clock = resolveLocalClock(new Date("2026-01-15T18:30:00Z"), -330);
    expect(clock.date).toBe("2026-01-16");
    expect(clock.hour).toBe(0);
    expect(clock.minutesOfDay).toBe(0);
  });

  it("rolls into the previous local day for a positive (west) offset", () => {
    // US Eastern: getTimezoneOffset() === 300. 02:00Z → 21:00 previous day.
    const clock = resolveLocalClock(new Date("2026-01-15T02:00:00Z"), 300);
    expect(clock.date).toBe("2026-01-14");
    expect(clock.hour).toBe(21);
    expect(clock.minutesOfDay).toBe(21 * 60);
  });
});

describe("parseReminderTime", () => {
  it("parses valid 24-hour times into minutes of day", () => {
    expect(parseReminderTime("00:00")).toBe(0);
    expect(parseReminderTime("08:15")).toBe(8 * 60 + 15);
    expect(parseReminderTime("23:59")).toBe(23 * 60 + 59);
  });

  it("rejects malformed or out-of-range times", () => {
    expect(parseReminderTime("24:00")).toBeNull();
    expect(parseReminderTime("20:60")).toBeNull();
    expect(parseReminderTime("8:15")).toBeNull();
    expect(parseReminderTime("")).toBeNull();
  });
});
