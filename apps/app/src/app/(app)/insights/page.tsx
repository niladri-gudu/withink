import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { getLocalDateString, isDateString } from "@/lib/utils/date";
import { InsightsDashboard } from "@/features/insights/components/insights-dashboard";
import { InsightsService } from "@/features/insights/services/insights-service";

export const metadata: Metadata = {
  title: "Private Insights - Withink",
  description:
    "Observe long-term habits, writing streaks, and emotional baseline trends in your digital journal sanctuary.",
};

export default async function InsightsPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today date
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  // 2. Fetch initial insights data (using UTC / timezone offset = 0 for initial SSR)
  const initialInsights = await InsightsService.getInsights(
    session.user.id,
    today,
    0,
  );

  return <InsightsDashboard initialData={initialInsights} localToday={today} />;
}
