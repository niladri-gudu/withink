export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

export function addDays(dateString: string, days: number): string {
  const date = parseLocalDateString(dateString);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

/** Format a YYYY-MM-DD local date string for display (avoids UTC timezone shifts). */
export function formatDisplayDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  },
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", options);
}

/**
 * Compute the current writing streak from a list of entry dates (descending).
 * `dates` must be sorted most-recent-first. Returns the count of consecutive
 * days written ending at today or yesterday.
 */
export function computeCurrentStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0;
  const yesterday = addDays(today, -1);
  const lastEntryDate = dates[0];
  if (lastEntryDate !== today && lastEntryDate !== yesterday) return 0;

  let currentStreak = 0;
  let expectedDate = lastEntryDate;
  for (const entryDate of dates) {
    if (entryDate === expectedDate) {
      currentStreak++;
      expectedDate = addDays(expectedDate, -1);
    } else if (entryDate < expectedDate) {
      break;
    }
  }
  return currentStreak;
}
