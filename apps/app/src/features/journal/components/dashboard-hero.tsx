import { getRequestEncryptionSettings } from "@/lib/request-cache";
import { computeCurrentStreak } from "@/lib/utils/date";
import { JournalService } from "@/features/journal/services/journal-service";

import { DashboardHeroLocal } from "./dashboard-hero-local";
import { DashboardHeroSkeleton } from "./dashboard-hero-skeleton";
import { StreakMarginNote } from "./streak-margin-note";
import { TodayReflectionCard } from "./today-reflection-card";
import { YesterdayBanner } from "./yesterday-banner";

export { DashboardHeroSkeleton };

interface DashboardHeroProps {
  userId: string;
  today: string;
  yesterday: string;
}

/**
 * Above-the-fold dashboard content (yesterday banner + today's card + streak).
 *
 * ZK accounts read today/yesterday and the streak from IndexedDB; non-ZK
 * accounts keep the server reads. Either way the page header streams first and
 * the hero paints as soon as its data resolves.
 */
export async function DashboardHero({
  userId,
  today,
  yesterday,
}: DashboardHeroProps) {
  // Memoized per request: the app layout already read these settings.
  const encryptionSettings = await getRequestEncryptionSettings(userId);
  if (encryptionSettings?.isClientEncrypted) {
    return <DashboardHeroLocal today={today} yesterday={yesterday} />;
  }

  const [todayEntry, yesterdayEntry, dates] = await Promise.all([
    JournalService.getEntryForDate(userId, today, today),
    JournalService.getEntryForDate(userId, yesterday, today),
    JournalService.getEntryDates(userId),
  ]);

  const currentStreak = computeCurrentStreak(dates, today);
  const yesterdayWritten = !!yesterdayEntry;

  return (
    <>
      {/* Yesterday's missed reflection — calm, dismissible, client-owned */}
      {!yesterdayWritten && (
        <YesterdayBanner yesterday={yesterday} today={today} />
      )}

      {/* Today's page + margin note */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <TodayReflectionCard entry={todayEntry} today={today} />
        <StreakMarginNote currentStreak={currentStreak} />
      </div>
    </>
  );
}
