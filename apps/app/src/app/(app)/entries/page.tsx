import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import {
  computeCurrentStreak,
  getLocalDateString,
  isDateString,
} from "@/lib/utils/date";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { EntriesPageShell } from "@/features/journal/components/entries-page-shell";
import { JournalService } from "@/features/journal/services/journal-service";
import { NotebooksService } from "@/features/notebooks/services/notebook-service";

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

  // 1. Determine local today date
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

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
    JournalService.getEntryStats(session.user.id),
    JournalService.getCalendarEntries(session.user.id),
    EncryptionSettingsRepository.getSettings(session.user.id),
    EntitlementsService.getEntitlements(session.user.id),
    NotebooksService.listNotebooks(session.user.id),
  ]);

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
      initialEntries={entriesData.entries}
      initialTotal={entriesData.total}
      initialCalendarEntries={calendarEntries}
      initialStreakData={streakData}
      localToday={today}
      accountEncrypted={!!encryptionSettings?.isClientEncrypted}
      backfillDays={entitlements.backfillDays}
      notebooks={notebooks.map((notebook) => ({
        id: notebook.id,
        name: notebook.name,
      }))}
      initialNotebookFilter={initialNotebookFilter}
    />
  );
}
