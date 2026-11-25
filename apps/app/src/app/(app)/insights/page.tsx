import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import {
  getRequestEncryptionSettings,
  getRequestSession,
} from "@/lib/request-cache";
import { getViewerToday } from "@/lib/viewer-today";
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
  const today = await getViewerToday();
  const tzCookie = cookieStore.get("withink-tz-offset")?.value;
  const tzOffset = tzCookie ? Number.parseInt(tzCookie, 10) || 0 : 0;

  // 2. Zero-knowledge accounts compute insights from their decrypted local
  //    timeline (the dashboard runs the shared pure aggregation), so the
  //    server aggregation read is skipped entirely. Legacy accounts keep the
  //    cached server path.
  const encryptionSettings = await getRequestEncryptionSettings(
    session.user.id,
  );
  const accountEncrypted = !!encryptionSettings?.isClientEncrypted;

  const initialInsights = accountEncrypted
    ? null
    : await getCachedInsights(session.user.id, today, tzOffset);

  return (
    <InsightsDashboard
      initialData={initialInsights}
      localToday={today}
      ssrTzOffset={tzOffset}
      localMode={accountEncrypted}
    />
  );
}
