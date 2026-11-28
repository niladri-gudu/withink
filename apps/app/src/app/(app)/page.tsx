import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession, getRequestViewerToday } from "@/lib/request-cache";
import { addDays, formatDisplayDate } from "@/lib/utils/date";
import { CloudRestorePrompt } from "@/features/journal/components/cloud-restore-prompt";
import { DashboardGreeting } from "@/features/journal/components/dashboard-greeting";
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

  const today = await getRequestViewerToday();
  const yesterday = addDays(today, -1);

  // 2. Header renders instantly from session + date; the data-dependent hero
  //    (banner, today's card, streak) and the below-the-fold sections stream
  //    in via their own Suspense boundaries.
  const firstName: string = session.user.name
    ? (session.user.name.split(" ")[0] ?? "Writer")
    : "Writer";

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      {/* Greeting settles to the viewer's local hour on the client; the
          server paints a neutral "Hello," so hydration never mismatches. */}
      <DashboardGreeting
        firstName={firstName}
        displayDate={formatDisplayDate(today, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      />

      <CloudRestorePrompt />

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
