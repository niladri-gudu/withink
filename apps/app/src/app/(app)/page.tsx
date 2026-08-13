import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@withink/ui/button";
import { Calendar, Flame } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import {
  addDays,
  computeCurrentStreak,
  formatDisplayDate,
  getLocalDateString,
  isDateString,
} from "@/lib/utils/date";
import DashboardLowerGrid, {
  DashboardLowerGridSkeleton,
} from "@/features/journal/components/dashboard-lower-grid";
import { TodayReflectionCard } from "@/features/journal/components/today-reflection-card";
import { JournalService } from "@/features/journal/services/journal-service";

export const metadata: Metadata = {
  title: "Diary Dashboard",
  description: "Your daily writing stats, history, and insights at a glance.",
};

export default async function DashboardPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();
  const yesterday = addDays(today, -1);

  // 2. Fetch data in parallel on the server. The below-the-fold dashboard
  // sections (flashback + recent reflections) stream in separately via
  // <DashboardLowerGrid> so the top of the page paints faster.
  const [todayEntry, yesterdayEntry, dates] = await Promise.all([
    JournalService.getEntryForDate(session.user.id, today, today),
    JournalService.getEntryForDate(session.user.id, yesterday, today),
    JournalService.getEntryDates(session.user.id),
  ]);

  // 3. Compute streak
  const currentStreak = computeCurrentStreak(dates, today);

  const firstName = session.user.name
    ? session.user.name.split(" ")[0]
    : "Writer";
  const todayFormatted = formatDisplayDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const yesterdayWritten = !!yesterdayEntry;

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      {/* Running head + today's page title */}
      <header>
        <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
          <span className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
            Today
          </span>
          <span className="text-muted-foreground/50 font-hand text-base leading-none">
            {todayFormatted}
          </span>
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
            {firstName}&apos;s page, one day at a time
          </p>
          <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
            Good morning,{" "}
            <span className="text-accent pl-1 text-4xl font-normal italic sm:text-5xl">
              {firstName}.
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">
            A fresh page for today&apos;s reflection
          </p>
        </div>
      </header>

      {/* Yesterday's Missed Reflection Alert Banner */}
      {!yesterdayWritten && (
        <div className="border-primary/10 bg-primary/5 animate-in slide-in-from-top-2 flex flex-col justify-between gap-4 rounded-xl border p-5 duration-300 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-foreground text-sm font-bold">
                Write Yesterday&apos;s Reflection
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                It looks like you missed writing yesterday. You still have time
                to capture your thoughts before the archive seals.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 cursor-pointer self-end px-5 sm:self-center"
          >
            <Link
              href={`${ROUTES.APP.ENTRY(yesterday)}?today=${today}` as Route}
            >
              Write Yesterday
            </Link>
          </Button>
        </div>
      )}

      {/* Today's page + margin note */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Today's Entry card */}
        <TodayReflectionCard entry={todayEntry} today={today} />

        {/* Day-streak margin note */}
        <div className="border-border flex flex-col justify-between rounded-xl border p-6">
          <p className="text-muted-foreground/70 font-serif text-[11px] font-semibold tracking-[0.2em] uppercase">
            Margin note
          </p>
          <div className="my-6 flex items-end gap-3">
            <Flame className="text-accent h-6 w-6" />
            <span className="text-foreground font-serif text-5xl leading-none font-bold">
              {currentStreak}
            </span>
            <span className="text-muted-foreground/70 pb-1 font-hand text-lg leading-none">
              day{currentStreak === 1 ? "" : "s"} in a row
            </span>
          </div>
          <p className="text-muted-foreground border-border/60 border-t pt-3 font-serif text-xs leading-relaxed">
            Keep the page open and the ink flowing. Streaks are a quiet record,
            never a demand.
          </p>
        </div>
      </div>

      {/* Bottom sections */}
      <Suspense fallback={<DashboardLowerGridSkeleton />}>
        <DashboardLowerGrid userId={session.user.id} today={today} />
      </Suspense>
    </div>
  );
}
