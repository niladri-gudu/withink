import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sanctuary Dashboard",
  description: "Your daily writing stats, history, and insights at a glance.",
};
import { ROUTES } from "@/constants/routes";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { JournalService } from "@/features/journal/services/journal-service";
import { FlashbackService } from "@/features/flashbacks/services/flashback-service";
import { DashboardFlashbackCard } from "@/features/flashbacks/components/flashback-card-content";
import { RecentReflectionsList } from "@/features/journal/components/recent-reflections-list";
import { TodayReflectionCard } from "@/features/journal/components/today-reflection-card";
import { getLocalDateString, addDays, isDateString, formatDisplayDate, computeCurrentStreak } from "@/lib/utils/date";
import { Flame, Calendar } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();
  const yesterday = addDays(today, -1);

  // 2. Fetch data in parallel on the server
  const [todayEntry, yesterdayEntry, recentData, dates] = await Promise.all([
    JournalService.getEntryForDate(session.user.id, today, today),
    JournalService.getEntryForDate(session.user.id, yesterday, today),
    JournalService.getEntriesPage(session.user.id, 1, 3, { today }),
    JournalService.getEntryDates(session.user.id),
  ]);

  // 3. Compute streak
  const currentStreak = computeCurrentStreak(dates, today);

  // 4. Calculate Anniversary or Past Flashback entry using the shared service
  const flashback = await FlashbackService.getFlashbackForToday(session.user.id, today);
  const flashbackEntry = flashback ? flashback.entry : null;
  const flashbackLabel = flashback ? flashback.label : "";

  const firstName = session.user.name ? session.user.name.split(" ")[0] : "Writer";
  const todayFormatted = formatDisplayDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const yesterdayWritten = !!yesterdayEntry;

  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      <header className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
          {todayFormatted}
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">
          Good morning,{" "}
          <span className="text-primary italic font-light text-4xl sm:text-5xl pl-1">
            {firstName}.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Welcome back to your private writing sanctuary
        </p>
      </header>

      {/* Yesterday's Missed Reflection Alert Banner */}
      {!yesterdayWritten && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-primary/10 bg-primary/5 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Write Yesterday&apos;s Reflection</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                It looks like you missed writing yesterday. You still have time to capture your thoughts before the archive seals.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-full shadow-sm cursor-pointer px-5 shrink-0 self-end sm:self-center">
            <Link href={`${ROUTES.APP.ENTRY(yesterday)}?today=${today}` as Route}>
              Write Yesterday
            </Link>
          </Button>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Entry card */}
        <TodayReflectionCard
          entry={todayEntry}
          today={today}
        />

        {/* Quick stats/streak */}
        <Card className="flex flex-col justify-between border border-border bg-card/60 backdrop-blur-sm" interactive>
          <CardHeader>
            <CardTitle className="text-xl font-serif font-semibold text-foreground">Sanctuary Stats</CardTitle>
            <CardDescription>Consistency tracking</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-center items-center py-6 space-y-2">
            <div className="relative flex items-center justify-center">
              {currentStreak > 0 && (
                <div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full scale-150 animate-pulse" />
              )}
              <Flame className={cn("h-16 w-16 text-orange-500 relative z-10", currentStreak > 0 && "animate-bounce")} />
            </div>
            <span className="text-4xl font-serif font-bold text-foreground">{currentStreak}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Day Streak
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flashback */}
        <DashboardFlashbackCard
          entry={flashbackEntry}
          label={flashbackLabel}
          today={today}
        />

        {/* Insights */}
        <Card className="border border-border bg-card/60 backdrop-blur-sm" interactive>
          <CardHeader>
            <CardTitle className="text-lg font-serif font-semibold text-foreground">Recent Reflections</CardTitle>
            <CardDescription>Your latest journal entries</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <RecentReflectionsList
              initialEntries={recentData.entries}
              today={today}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
