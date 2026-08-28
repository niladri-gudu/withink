import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { isDateString } from "@/lib/utils/date";
import { PageHeader } from "@/features/app-shell/components/page-header";
import { BillingReturnBanner } from "@/features/billing/components/billing-return-banner";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { SettingsShell } from "@/features/settings/components/settings-shell";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Configure your profile, theme preferences, paper feel, and security options.",
};

export default async function SettingsPage() {
  const session = await getRequestSession();

  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const settingsUser = {
    id: session.user.id,
    name: session.user.name || "Writer",
    email: session.user.email,
    image: session.user.image,
  };

  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : undefined;

  // Resolved plan drives appearance gating (curated palettes/fonts/accents).
  // Server-side resolution only — the client never self-reports its tier.
  const entitlements = await EntitlementsService.getEntitlements(
    session.user.id,
  );

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      <PageHeader
        runningHead="Settings"
        note="tune the desk to suit the writer"
        title="Diary"
        accent="settings."
        description="Adjust your writing experience and preferences"
        today={today}
      />

      {/* Post-checkout feedback (Dodo return_url lands here) */}
      <Suspense fallback={null}>
        <BillingReturnBanner />
      </Suspense>

      <SettingsShell initialUser={settingsUser} plan={entitlements.plan} />
    </div>
  );
}
