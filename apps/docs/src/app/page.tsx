import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LandingPageContent } from "@/components/landing-page-content";

export const metadata: Metadata = {
  title: "withink. - your private journal",
  description:
    "A private, encrypted journal. One entry a day, saved offline and exported anytime as plain text - no trackers, no noise.",
};

async function LandingPageContentWithSession({ APP_URL }: { APP_URL: string }) {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has("better-auth.session_token") ||
    cookieStore.has("__Secure-better-auth.session_token");

  return <LandingPageContent APP_URL={APP_URL} hasSession={hasSession} />;
}

export default async function LandingPage() {
  const isProd = process.env.IS_PROD === "true";
  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    (isProd ? "https://app.withink.me" : "http://localhost:3000");

  return (
    <Suspense
      fallback={<LandingPageContent APP_URL={APP_URL} hasSession={false} />}
    >
      <LandingPageContentWithSession APP_URL={APP_URL} />
    </Suspense>
  );
}
