import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@withink/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@withink/ui/card";
import { cn } from "@withink/utils";
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
  title: "Sanctuary Dashboard",
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
    <div className="animate-in fade-in mx-auto w-full max-w-5xl flex-grow space-y-8 p-6 duration-300 md:p-10">
      <header className="space-y-1">
        <span className="text-muted-foreground/60 block font-mono text-[10px] tracking-[0.25em] uppercase">
          {todayFormatted}
        </span>
        <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          Good morning,{" "}
          <span className="text-primary pl-1 text-4xl font-light italic sm:text-5xl">
            {firstName}.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Welcome back to your private writing sanctuary
        </p>
      </header>

      {/* Yesterday's Missed Reflection Alert Banner */}
      {!yesterdayWritten && (
        <div className="border-primary/10 bg-primary/5 animate-in slide-in-from-top-2 flex flex-col justify-between gap-4 rounded-2xl border p-5 backdrop-blur-sm duration-300 sm:flex-row sm:items-center">
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
            className="shrink-0 cursor-pointer self-end rounded-full px-5 shadow-sm sm:self-center"
          >
            <Link
              href={`${ROUTES.APP.ENTRY(yesterday)}?today=${today}` as Route}
            >
              Write Yesterday
            </Link>
          </Button>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Today's Entry card */}
        <TodayReflectionCard entry={todayEntry} today={today} />

        {/* Quick stats/streak */}
        <Card
          className="border-border bg-card/60 flex flex-col justify-between border backdrop-blur-sm"
          interactive
        >
          <CardHeader>
            <CardTitle className="text-foreground font-serif text-xl font-semibold">
              Sanctuary Stats
            </CardTitle>
            <CardDescription>Consistency tracking</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-grow flex-col items-center justify-center space-y-2 py-6">
            <div className="relative flex items-center justify-center">
              {currentStreak > 0 && (
                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-orange-500/10 blur-xl" />
              )}
              <Flame
                className={cn(
                  "relative z-10 h-16 w-16 text-orange-500",
                  currentStreak > 0 && "animate-bounce",
                )}
              />
            </div>
            <span className="text-foreground font-serif text-4xl font-bold">
              {currentStreak}
            </span>
            <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              Day Streak
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Bottom sections */}
      <Suspense fallback={<DashboardLowerGridSkeleton />}>
        <DashboardLowerGrid userId={session.user.id} today={today} />
      </Suspense>
    </div>
  );
}
