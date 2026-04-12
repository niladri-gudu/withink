/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getLocalDateString } from "@/lib/utils/date";
import { DeleteEntryButton } from "@/components/delete-entry-button";

export default async function JournalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  await connectDB();

  const today = getLocalDateString();

  const entries = await Entry.find(
    { userId: session.user.id },
    { date: 1, title: 1, wordCount: 1 },
  )
    .sort({ date: -1 })
    .limit(10)
    .lean();

  const todayEntry = (entries as any[]).find((e) => e.date === today);

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <main className="max-w-2xl mx-auto px-6 py-16 space-y-12">

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Hey, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Today card */}
        <div className="group border border-border hover:border-border/80 rounded-2xl p-6 transition-all bg-card/30 hover:bg-card/60">
          <div className="flex items-center justify-between">
            <Link href={`/journal/${today}`} className="flex-1">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Today
                </p>
                {todayEntry ? (
                  <>
                    <p className="text-lg font-medium text-foreground">
                      {(todayEntry as any).title || "Untitled"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(todayEntry as any).wordCount} words
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-medium text-muted-foreground">
                    Write today&apos;s entry
                  </p>
                )}
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link href={`/journal/${today}`}>
                <PenLine className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </Link>
              {todayEntry && <DeleteEntryButton date={today} />}
            </div>
          </div>
        </div>

        {/* Recent entries */}
        {entries.filter((e) => e.date !== today).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest">
              Recent
            </h2>
            <div className="space-y-1">
              {(entries as any[])
                .filter((e) => e.date !== today)
                .map((entry) => (
                  <div
                    key={entry.date}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-accent/30 transition-all group border border-transparent hover:border-border"
                  >
                    <Link
                      href={`/journal/${entry.date}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                          {entry.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            entry.date + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-muted-foreground">
                        {entry.wordCount} words
                      </span>
                      <DeleteEntryButton date={entry.date} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}