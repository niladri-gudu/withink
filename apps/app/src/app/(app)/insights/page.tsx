import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { getLocalDateString, isDateString } from "@/lib/utils/date";
import { InsightsDashboard } from "@/features/insights/components/insights-dashboard";
import { getCachedInsights } from "@/features/insights/services/insights-cache";

export const metadata: Metadata = {
  title: "Private Insights - Withink",
  description:
    "Observe long-term habits, writing streaks, and emotional baseline trends in your digital journal diary.",
};

export default async function InsightsPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today date + timezone offset from cookies set by the
  //    client shell. With the correct offset known at SSR time, the cached
  //    computation matches the user's real timezone and the client-side
  //    refetch in InsightsDashboard becomes a rare fallback.
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();
  const tzCookie = cookieStore.get("withink-tz-offset")?.value;
  const tzOffset = tzCookie ? Number.parseInt(tzCookie, 10) || 0 : 0;

  // 2. Fetch cached insights for the user's local day and timezone
  const initialInsights = await getCachedInsights(
    session.user.id,
    today,
    tzOffset,
  );

  return (
    <InsightsDashboard
      initialData={initialInsights}
      localToday={today}
      ssrTzOffset={tzOffset}
    />
  );
}
