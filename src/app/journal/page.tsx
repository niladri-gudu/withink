/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";
import { getLocalDateString } from "@/lib/utils/date";
import { JournalHome } from "@/components/journal/journal-home";
import { safeDecrypt } from "@/lib/encryption";

export default async function JournalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  await connectDB();

  const today = getLocalDateString();

  const [todayEntry, allEntries] = await Promise.all([
    Entry.findOne({ userId: session.user.id, date: today }).lean(),
    Entry.find(
      { userId: session.user.id },
      { date: 1, title: 1, wordCount: 1, contentText: 1, contentHtml: 1 },
    )
      .sort({ date: -1 })
      .limit(15)
      .lean(),
  ]);

  const entries = (allEntries as any[]).map((e) => {
    const decryptedText = safeDecrypt(e.contentText || "");
    return {
      date: e.date,
      title: e.title || "",
      wordCount: e.wordCount || 0,
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
    />
  );
}
