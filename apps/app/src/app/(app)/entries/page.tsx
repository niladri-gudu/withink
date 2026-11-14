import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import {
  getRequestCalendarEntries,
  getRequestEncryptionSettings,
  getRequestEntitlements,
  getRequestEntryStats,
  getRequestNotebooks,
  getRequestSession,
} from "@/lib/request-cache";
import { computeCurrentStreak } from "@/lib/utils/date";
import { getViewerToday } from "@/lib/viewer-today";
import { EntriesPageShell } from "@/features/journal/components/entries-page-shell";
import { JournalService } from "@/features/journal/services/journal-service";

export const metadata: Metadata = {
  title: "Reflections Timeline",
  description: "Browse and search through your past journal entries.",
};

interface EntriesPageProps {
  searchParams: Promise<{
    /** Deep-linkable notebook scope (from /notebooks card clicks). */
    notebook?: string;
  }>;
}

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { notebook: notebookParam } = await searchParams;

  const today = await getViewerToday();

  // 2. Fetch data in parallel on the server. The calendar entries already
  //    contain the full date list, so derive it from them instead of issuing a
  //    duplicate getEntryDates round trip.
  const [
    entriesData,
    stats,
    calendarEntries,
    encryptionSettings,
    entitlements,
    notebooks,
  ] = await Promise.all([
    JournalService.getEntriesPage(session.user.id, 1, 5, { today }),
    getRequestEntryStats(session.user.id),
    getRequestCalendarEntries(session.user.id),
    // Memoized per request: the app layout already read the same settings.
    getRequestEncryptionSettings(session.user.id),
    getRequestEntitlements(session.user.id),
    getRequestNotebooks(session.user.id),
  ]);

  const accountEncrypted = !!encryptionSettings?.isClientEncrypted;

  // 3. Compute current streak from the calendar's date list (sorted desc).
  const dates = calendarEntries.map((entry) => entry.date);
  const currentStreak = computeCurrentStreak(dates, today);

  const streakData = {
    currentStreak,
    totalEntries: dates.length,
    totalWords: stats.totalWords,
    averageWords: stats.averageWords,
  };

  // The notebook param is honored only when it names a real notebook —
  // anything else degrades to the unscoped timeline.
  const initialNotebookFilter =
    notebookParam &&
    /^[a-f\d]{24}$/i.test(notebookParam) &&
    notebooks.some((notebook) => notebook.id === notebookParam)
      ? notebookParam
      : "all";

  return (
    <EntriesPageShell
      // ZK accounts decrypt the timeline locally and never read these server
      // rows (they are ciphertext), so don't ship them through the RSC payload.
      initialEntries={accountEncrypted ? [] : entriesData.entries}
      initialTotal={accountEncrypted ? 0 : entriesData.total}
      initialCalendarEntries={calendarEntries}
      initialStreakData={streakData}
      localToday={today}
      accountEncrypted={accountEncrypted}
      backfillDays={entitlements.backfillDays}
      notebooks={notebooks.map((notebook) => ({
        id: notebook.id,
        name: notebook.name,
      }))}
      initialNotebookFilter={initialNotebookFilter}
    />
  );
}
