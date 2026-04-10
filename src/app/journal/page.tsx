import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getLocalDateString } from "@/lib/utils/date";

export default async function JournalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  await connectDB();

  const today = getLocalDateString();

  const entries = await Entry.find(
    { userId: session.user.id },
    { date: 1, title: 1, wordCount: 1, contentText: 1 },
  )
    .sort({ date: -1 })
    .limit(10)
    .lean();

  const todayEntry = (entries as any[]).find((e) => e.date === today);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <main className="max-w-2xl mx-auto px-6 py-16 space-y-12">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Hey, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-zinc-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Today CTA */}
        <Link href={`/journal/${today}`}>
          <div className="group border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all cursor-pointer bg-zinc-900/30 hover:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Today
                </p>
                {todayEntry ? (
                  <>
                    <p className="text-lg font-medium text-zinc-100">
                      {todayEntry.title || "Untitled"}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {todayEntry.wordCount} words
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-medium text-zinc-400">
                    Write today's entry
                  </p>
                )}
              </div>
              <PenLine className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
          </div>
        </Link>

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest">
              Recent
            </h2>
            <div className="space-y-2">
              {(entries as any[])
                .filter((e) => e.date !== today)
                .map((entry) => (
                  <Link key={entry.date} href={`/journal/${entry.date}`}>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-zinc-900/60 transition-all group border border-transparent hover:border-zinc-800">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                          {entry.title || "Untitled"}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {new Date(
                            entry.date + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {entry.wordCount} words
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
