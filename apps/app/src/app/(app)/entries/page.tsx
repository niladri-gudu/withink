import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { auth } from "@/lib/auth";
import {
  computeCurrentStreak,
  getLocalDateString,
  isDateString,
} from "@/lib/utils/date";
import { EntriesPageShell } from "@/features/journal/components/entries-page-shell";
import { JournalService } from "@/features/journal/services/journal-service";

export const metadata: Metadata = {
  title: "Reflections Timeline",
  description: "Browse and search through your past journal entries.",
};

export default async function EntriesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today date
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  // 2. Fetch data in parallel on the server
  const [entriesData, stats, dates, calendarEntries] = await Promise.all([
    JournalService.getEntriesPage(session.user.id, 1, 5, { today }),
    JournalService.getEntryStats(session.user.id),
    JournalService.getEntryDates(session.user.id),
    JournalService.getCalendarEntries(session.user.id),
  ]);

  // 3. Compute current streak
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
    />
  );
}
