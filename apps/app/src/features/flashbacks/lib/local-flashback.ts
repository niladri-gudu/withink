import { addDays } from "@withink/core/date";

export interface LocalFlashbackPick {
  date: string;
  label: string;
}

const HISTORY_KEY = "withink-flashback-history";
const HISTORY_LIMIT = 10;

/** Non-secret, device-local "recently shown" list (mirrors the Redis one). */
export function readLocalFlashbackHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeLocalFlashbackHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, HISTORY_LIMIT)),
    );
  } catch {
    // Private mode / quota: history is an optimization, never a requirement.
  }
}

/**
 * Pure local equivalent of `FlashbackService.getFlashbackForToday` selection:
 * anniversary first, then a daily-stable random archive choice that avoids
 * recently shown dates. Returns the next history so the caller can persist it
 * outside render.
 */
export function selectLocalFlashback(
  dates: string[],
  today: string,
  history: string[],
): { pick: LocalFlashbackPick | null; history: string[] } {
  const yesterday = addDays(today, -1);
  const allPastDates = dates.filter((date) => date < yesterday);
  if (allPastDates.length === 0) return { pick: null, history };

  // Prefer dates not recently shown — including for the anniversary branch.
  // If the user already saw today's anniversary (or pressed "Show another"),
  // fall through to the wider archive instead of repeating the same memory.
  const unseen = allPastDates.filter((date) => !history.includes(date));
  const pastDates = unseen.length > 0 ? unseen : allPastDates;

  const todayMMDD = today.substring(5);
  const anniversaryDates = pastDates.filter((date) => date.endsWith(todayMMDD));

  if (anniversaryDates.length > 0) {
    const [todayYear] = today.split("-").map(Number);
    const oneYearAgo = `${(todayYear ?? 0) - 1}${todayMMDD}`;
    if (anniversaryDates.includes(oneYearAgo)) {
      return {
        pick: { date: oneYearAgo, label: "Exactly one year ago today" },
        history,
      };
    }
    const selected = anniversaryDates[0]!;
    const [year] = selected.split("-").map(Number);
    const yearsAgo = (todayYear ?? 0) - (year ?? 0);
    return {
      pick: {
        date: selected,
        label: `Exactly ${yearsAgo} ${yearsAgo === 1 ? "year" : "years"} ago today`,
      },
      history,
    };
  }

  const candidates = pastDates;

  // Stable within a day, varies across days; avoids re-renders picking
  // different entries.
  const seed = today
    .split("-")
    .reduce((acc, part) => acc * 31 + Number(part), 7);
  const selected = candidates[Math.abs(seed) % candidates.length]!;

  return {
    pick: { date: selected, label: "A reflection from your archives" },
    history: [selected, ...history.filter((date) => date !== selected)].slice(
      0,
      HISTORY_LIMIT,
    ),
  };
}
