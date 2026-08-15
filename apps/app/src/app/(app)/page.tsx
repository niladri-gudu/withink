import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import {
  addDays,
  formatDisplayDate,
  getLocalDateString,
  isDateString,
} from "@/lib/utils/date";
import {
  DashboardHero,
  DashboardHeroSkeleton,
} from "@/features/journal/components/dashboard-hero";
import DashboardLowerGrid, {
  DashboardLowerGridSkeleton,
} from "@/features/journal/components/dashboard-lower-grid";

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

  // 2. Header renders instantly from session + date; the data-dependent hero
  //    (banner, today's card, streak) and the below-the-fold sections stream
  //    in via their own Suspense boundaries.
  const firstName = session.user.name
    ? session.user.name.split(" ")[0]
    : "Writer";
  const todayFormatted = formatDisplayDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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

      {/* Above-the-fold hero (streamed) */}
      <Suspense fallback={<DashboardHeroSkeleton />}>
        <DashboardHero
          userId={session.user.id}
          today={today}
          yesterday={yesterday}
        />
      </Suspense>

      {/* Bottom sections */}
      <Suspense fallback={<DashboardLowerGridSkeleton />}>
        <DashboardLowerGrid userId={session.user.id} today={today} />
      </Suspense>
    </div>
  );
}
