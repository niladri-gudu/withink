import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Reflections Timeline",
  description: "Browse and search through your past journal entries.",
};
import { JournalService } from "@/features/journal/services/journal-service";
import { EntriesPageShell } from "@/features/journal/components/entries-page-shell";
import { isDateString, getLocalDateString, addDays } from "@/lib/utils/date";

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
  const [entriesData, stats, dates] = await Promise.all([
    JournalService.getEntriesPage(session.user.id, 1, 5, { today }),
    JournalService.getEntryStats(session.user.id),
    JournalService.getEntryDates(session.user.id),
  ]);

  // 3. Compute current streak
  let currentStreak = 0;
  const totalEntries = dates.length;
  if (totalEntries > 0) {
    const yesterday = addDays(today, -1);
    const lastEntryDate = dates[0];
    if (lastEntryDate === today || lastEntryDate === yesterday) {
      let expectedDate = lastEntryDate;
      for (const entryDate of dates) {
        if (entryDate === expectedDate) {
          currentStreak++;
          expectedDate = addDays(expectedDate, -1);
        } else if (entryDate < expectedDate) {
          break;
        }
      }
    }
  }

  const streakData = {
    currentStreak,
    totalEntries,
    totalWords: stats.totalWords,
    averageWords: stats.averageWords,
  };

  return (
    <EntriesPageShell
      initialEntries={entriesData.entries}
      initialTotal={entriesData.total}
      initialWrittenDates={dates}
      initialStreakData={streakData}
      localToday={today}
    />
  );
}
