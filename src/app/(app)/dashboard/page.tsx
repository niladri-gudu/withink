import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
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
import { isDateString, getLocalDateString, addDays } from "@/lib/utils/date";
import { 
  Flame, 
  ArrowRight,
  Angry, Frown, Meh, Smile, SmilePlus, FileText, CheckCircle2
} from "lucide-react";

const moodIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: SmilePlus,
};

const moodColors: Record<number, string> = {
  1: "text-red-500 bg-red-500/10 border-red-500/20",
  2: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  3: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  4: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  5: "text-teal-500 bg-teal-500/10 border-teal-500/20",
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  // 2. Fetch data in parallel on the server
  const [todayEntry, recentData, , dates] = await Promise.all([
    JournalService.getEntryForDate(session.user.id, today, today),
    JournalService.getEntriesPage(session.user.id, 1, 3, { today }),
    JournalService.getEntryStats(session.user.id),
    JournalService.getEntryDates(session.user.id),
  ]);

  // 3. Compute streak
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

  // 4. Calculate Anniversary or Past Flashback entry using the shared service
  const flashback = await FlashbackService.getFlashbackForToday(session.user.id, today);
  const flashbackEntry = flashback ? flashback.entry : null;
  const flashbackLabel = flashback ? flashback.label : "";

  const firstName = session.user.name ? session.user.name.split(" ")[0] : "Writer";
  const todayFormatted = formatDate(today);
  const todayWritten = !!todayEntry;

  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      <header className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
          {todayFormatted}
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none text-foreground">
          Good morning,{" "}
          <span className="text-primary italic font-light text-4xl sm:text-5xl pl-1">
            {firstName}.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Welcome back to your private writing sanctuary
        </p>
      </header>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Entry card */}
        <Card className="md:col-span-2 flex flex-col border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden">
          {todayWritten && (
            <div className="absolute top-0 right-0 p-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-xl font-serif font-black text-foreground">
              Today&apos;s Reflection
            </CardTitle>
            <CardDescription>
              {todayWritten ? "Your entry for today is secure" : "Begin writing your reflection for today"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-2 space-y-6">
            <p className="text-sm font-serif text-muted-foreground leading-relaxed">
              {todayWritten
                ? `You have written your reflection for today. It contains ${todayEntry.wordCount} words and represents your sanctuary log for this calendar slot. Feel free to revise or review it.`
                : "Take a brief moment to sit back, breathe, and write about how your day is going. Reflections keep your mind clear and your memories alive."}
            </p>
            <Button asChild className="w-fit cursor-pointer rounded-full shadow-sm">
              <Link href={`${ROUTES.APP.ENTRY(today)}?today=${today}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                {todayWritten ? "Edit Entry" : "Write Reflection"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick stats/streak */}
        <Card className="flex flex-col justify-between border border-border bg-card/60 backdrop-blur-sm" interactive>
          <CardHeader>
            <CardTitle className="text-xl font-serif font-black text-foreground">Sanctuary Stats</CardTitle>
            <CardDescription>Consistency tracking</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-center items-center py-6 space-y-2">
            <div className="relative flex items-center justify-center">
              {currentStreak > 0 && (
                <div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full scale-150 animate-pulse" />
              )}
              <Flame className={cn("h-16 w-16 text-orange-500 relative z-10", currentStreak > 0 && "animate-bounce")} />
            </div>
            <span className="text-4xl font-serif font-black text-foreground">{currentStreak}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Day Streak
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flashback */}
        <Card className="border border-border bg-card/60 backdrop-blur-sm" interactive>
          <CardHeader>
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-semibold">
              {flashbackLabel || "Flashback"}
            </span>
            <CardTitle className="text-lg font-serif font-black text-foreground">
              {flashbackEntry ? flashbackEntry.title || "Untitled Reflection" : "Anniversary Flashback"}
            </CardTitle>
            <CardDescription>
              {flashbackEntry ? formatDateShort(flashbackEntry.date) : "Revisit a moment in time"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-serif text-muted-foreground leading-relaxed italic">
              {flashbackEntry
                ? `${
                    flashbackEntry.contentText.length > 220
                      ? flashbackEntry.contentText.substring(0, 220) + "..."
                      : flashbackEntry.contentText
                  }`
                : "You haven't written any entries yet. Revisit this card tomorrow to see what you wrote in the past."}
            </p>
            {flashbackEntry && (
              <Button asChild variant="link" className="p-0 text-primary hover:text-primary/80 h-auto cursor-pointer text-xs font-bold font-mono uppercase tracking-widest gap-1">
                <Link href={`${ROUTES.APP.ENTRY(flashbackEntry.date)}?today=${today}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                  Re-read Entry
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border border-border bg-card/60 backdrop-blur-sm" interactive>
          <CardHeader>
            <CardTitle className="text-lg font-serif font-black text-foreground">Recent Reflections</CardTitle>
            <CardDescription>Your latest journal entries</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {recentData.entries.length === 0 ? (
              <div className="text-sm font-serif text-muted-foreground text-center py-10">
                No entries found.
              </div>
            ) : (
              <div className="space-y-4">
                {recentData.entries.map((entry) => {
                  const MoodIcon = (entry.mood && moodIcons[entry.mood]) || FileText;
                  const moodColor = entry.mood ? moodColors[entry.mood] : "text-muted-foreground/60 bg-muted/10 border-border/10";
                  
                  return (
                    <Link key={entry.date} href={`${ROUTES.APP.ENTRY(entry.date)}?today=${today}` as unknown as ComponentPropsWithoutRef<typeof Link>["href"]} className="block">
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${moodColor}`}>
                            <MoodIcon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-serif font-bold text-sm text-foreground truncate">
                              {entry.title || "Untitled Entry"}
                            </h4>
                            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                              {formatDateShort(entry.date)}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-2 flex justify-end">
                  <Button asChild variant="ghost" size="sm" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 p-0 hover:bg-transparent">
                    <Link href={ROUTES.APP.ENTRIES}>
                      View Archive
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
