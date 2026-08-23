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
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { EntriesPageShell } from "@/features/journal/components/entries-page-shell";
import { JournalService } from "@/features/journal/services/journal-service";

export const metadata: Metadata = {
  title: "Reflections Timeline",
  description: "Browse and search through your past journal entries.",
};

export default async function EntriesPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today date
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  // 2. Fetch data in parallel on the server. The calendar entries already
  //    contain the full date list, so derive it from them instead of issuing a
  //    duplicate getEntryDates round trip.
  const [entriesData, stats, calendarEntries, encryptionSettings] =
    await Promise.all([
      JournalService.getEntriesPage(session.user.id, 1, 5, { today }),
      JournalService.getEntryStats(session.user.id),
      JournalService.getCalendarEntries(session.user.id),
      EncryptionSettingsRepository.getSettings(session.user.id),
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

  return (
    <EntriesPageShell
      initialEntries={entriesData.entries}
      initialTotal={entriesData.total}
      initialCalendarEntries={calendarEntries}
      initialStreakData={streakData}
      localToday={today}
      accountEncrypted={!!encryptionSettings?.isClientEncrypted}
    />
  );
}
