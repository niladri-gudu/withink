import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { addDays } from "@/lib/utils/date";
import { getViewerToday } from "@/lib/viewer-today";
import { PageHeader } from "@/features/app-shell/components/page-header";
import {
  DashboardHero,
  DashboardHeroSkeleton,
} from "@/features/journal/components/dashboard-hero";
import DashboardLowerGrid, {
  DashboardLowerGridSkeleton,
} from "@/features/journal/components/dashboard-lower-grid";
import { LetterArrival } from "@/features/letters/components/letter-arrival";

export const metadata: Metadata = {
  title: "Diary Dashboard",
  description: "Your daily writing stats, history, and insights at a glance.",
};

export default async function DashboardPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const today = await getViewerToday();
  const yesterday = addDays(today, -1);

  // 2. Header renders instantly from session + date; the data-dependent hero
  //    (banner, today's card, streak) and the below-the-fold sections stream
  //    in via their own Suspense boundaries.
  const firstName = session.user.name
    ? session.user.name.split(" ")[0]
    : "Writer";

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      <PageHeader
        runningHead="Today"
        note={`${firstName}'s page, one day at a time`}
        title="Good morning,"
        accent={`${firstName}.`}
        description="A fresh page for today's reflection"
        today={today}
      />

      {/* Above-the-fold hero (streamed) */}
      <Suspense fallback={<DashboardHeroSkeleton />}>
        <DashboardHero
          userId={session.user.id}
          today={today}
          yesterday={yesterday}
        />
      </Suspense>

      {/* A delivered-but-unopened letter gets its quiet arrival moment. */}
      <Suspense fallback={null}>
        <LetterArrival userId={session.user.id} />
      </Suspense>

      {/* Bottom sections */}
      <Suspense fallback={<DashboardLowerGridSkeleton />}>
        <DashboardLowerGrid userId={session.user.id} today={today} />
      </Suspense>
    </div>
  );
}
