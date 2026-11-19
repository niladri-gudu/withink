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

  // 2. Resolve the encryption flag first (request-memoized — the app layout
  //    already read the same settings). ZK accounts read the archive from
  //    IndexedDB, so the unbounded calendar/stats/entries Mongo reads are
  //    skipped entirely; non-ZK accounts keep the server path.
  const encryptionSettings = await getRequestEncryptionSettings(
    session.user.id,
  );
  const accountEncrypted = !!encryptionSettings?.isClientEncrypted;

  const [entriesData, stats, calendarEntries, entitlements, notebooks] =
    await Promise.all([
      accountEncrypted
        ? Promise.resolve(null)
        : JournalService.getEntriesPage(session.user.id, 1, 5, { today }),
      accountEncrypted
        ? Promise.resolve(null)
        : getRequestEntryStats(session.user.id),
      accountEncrypted
        ? Promise.resolve(null)
        : getRequestCalendarEntries(session.user.id),
      getRequestEntitlements(session.user.id),
      getRequestNotebooks(session.user.id),
    ]);

  const calendar = calendarEntries ?? [];

  // 3. Compute current streak from the calendar's date list (sorted desc).
  //    For ZK accounts the shell derives this from the local timeline.
  const dates = calendar.map((entry) => entry.date);
  const currentStreak = computeCurrentStreak(dates, today);

  const streakData = {
    currentStreak,
    totalEntries: dates.length,
    totalWords: stats?.totalWords ?? 0,
    averageWords: stats?.averageWords ?? 0,
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
      // ZK accounts read the archive from IndexedDB (the shell derives the
      // calendar/streak locally), so no server rows are shipped or awaited.
      initialEntries={entriesData?.entries ?? []}
      initialTotal={entriesData?.total ?? 0}
      initialCalendarEntries={calendar}
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
