import { addDays } from "./date";

/** How many recently-shown dates to remember per device. */
export const FLASHBACK_HISTORY_LIMIT = 10;

export interface LocalFlashbackPick {
  date: string;
  label: string;
}

/**
 * Pure local equivalent of the server's flashback selection: anniversary
 * first, then a daily-stable archive choice that avoids recently shown dates.
 *
 * Framework-neutral so the web client and the native app share one rule set.
 * Returns the next history so the caller can persist it outside render.
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
      FLASHBACK_HISTORY_LIMIT,
    ),
  };
}
