/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocalDateString } from "@/lib/utils/date";
import { JournalHome } from "@/components/journal/journal-home";
import { safeDecrypt } from "@/lib/encryption";
import { getStreakData } from "@/actions/streak";
import { cookies } from "next/headers";
import { isDateString } from "@/lib/utils/date";
import {
  getCachedEntry,
  getCachedEntryStats,
  getCachedEntrySummaries,
} from "@/lib/entry-cache";

export default async function JournalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const cookieToday = (await cookies()).get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  const [todayEntry, allEntries, streakData, entryStats] = await Promise.all([
    getCachedEntry(session.user.id, today, today),
    getCachedEntrySummaries(session.user.id, 15),
    getStreakData(today),
    getCachedEntryStats(session.user.id),
  ]);

  const entries = (allEntries as any[]).map((e) => {
    const decryptedText = safeDecrypt(e.contentText || "");
    return {
      date: e.date,
      title: e.title || "",
      wordCount: e.wordCount || 0,
      mood: e.mood || null,
      preview: decryptedText.trim().split("\n")[0]?.slice(0, 80) || "",
      contentHtml: safeDecrypt(e.contentHtml || ""),
    };
  });

  const todayHtml = todayEntry
    ? safeDecrypt((todayEntry as any).contentHtml)
    : "";

  return (
    <JournalHome
      today={today}
      todayHtml={todayHtml}
      todayTitle={(todayEntry as any)?.title || ""}
      entries={entries}
      userName={session.user.name?.split(" ")[0] ?? ""}
      streak={streakData.currentStreak}
      totalEntries={streakData.totalEntries}
      totalWords={entryStats.totalWords}
    />
  );
}
