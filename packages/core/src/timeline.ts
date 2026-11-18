import { addDays } from "./date";

/**
 * A decrypted local timeline record. This is the shape persisted in the
 * encrypted metadata store and used by the client timeline/search.
 */
export interface CachedEntryMetadata {
  date: string;
  title: string;
  /** Short preview shown in timeline cards. */
  snippet: string;
  /** Full plaintext of the entry, used for local search. */
  contentText: string;
  wordCount: number;
  mood: number | null;
  /** Notebook filing (v3+). Absent on records written before notebooks. */
  notebookId?: string;
  updatedAt: string;
  /** Schema version so sync can re-fetch records written by older code. */
  v: number;
  /** Precomputed lowercase search blob (title + full text + date forms) so
   *  filtering never re-lowercases/re-locale-formats every record per keystroke.
   *  Absent on records written before this field was added; the filter falls
   *  back to computing it on the fly for those. */
  searchText?: string;
  /** Server-created timestamp. Optional on rows written before local insights. */
  createdAt?: string;
}

export interface LocalTimelineFilters {
  moodFilter?: number | "all";
  timeFilter?: "all" | "week" | "month";
  search?: string;
  /** Notebook scope ("all" or a notebook id); unset means all. */
  notebookFilter?: string;
  localToday: string;
}

/**
 * Builds the lowercase search blob used by `filterLocalTimeline`. Computed once
 * at save time (not per keystroke) so searching a large journal stays cheap.
 */
export function buildSearchText(
  date: string,
  title: string,
  contentText: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  let dateForms = "";
  if (year !== undefined && month !== undefined && day !== undefined) {
    const dateObj = new Date(year, month - 1, day);
    dateForms = [
      dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    ]
      .join(" ")
      .toLowerCase();
  }
  return [title, contentText, date, dateForms].join(" ").toLowerCase();
}

/** Extracts a clean text snippet from content text. */
export function createSnippet(text: string, maxLength = 240): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + "…"
    : cleaned;
}

/**
 * Pure filter over a decrypted local timeline. Extracted from the timeline
 * component so the search/filter behavior is unit-testable and shared by web
 * and native clients.
 *
 * Search matches the FULL entry text (falling back to the snippet for records
 * not yet re-synced to the full-text format), the title, the ISO date, and
 * human-readable date forms ("Jul 1", "July 4, 2026").
 */
export function filterLocalTimeline(
  cached: CachedEntryMetadata[],
  filters: LocalTimelineFilters,
): CachedEntryMetadata[] {
  const {
    moodFilter = "all",
    timeFilter = "all",
    search = "",
    notebookFilter,
    localToday,
  } = filters;

  let filtered = cached;

  // Records written before the notebook field was added carry no notebookId;
  // they are excluded from a scoped view until a re-sync backfills it.
  if (notebookFilter && notebookFilter !== "all") {
    filtered = filtered.filter((item) => item.notebookId === notebookFilter);
  }

  if (moodFilter !== "all") {
    const m = Number(moodFilter);
    filtered = filtered.filter((item) => item.mood === m);
  }

  if (timeFilter !== "all") {
    filtered = filtered.filter((item) => {
      if (timeFilter === "week") {
        return item.date >= addDays(localToday, -7) && item.date <= localToday;
      }
      if (timeFilter === "month") {
        return item.date >= addDays(localToday, -30) && item.date <= localToday;
      }
      return true;
    });
  }

  if (search.trim()) {
    const queryLower = search.trim().toLowerCase();
    filtered = filtered.filter((item) => {
      // Fast path: precomputed lowercase blob written at save time. Records
      // written before that field existed fall back to computing it inline.
      const searchText = (
        item.searchText ||
        buildSearchText(item.date, item.title, item.contentText || item.snippet)
      ).toLowerCase();
      return searchText.includes(queryLower);
    });
  }

  return filtered;
}
