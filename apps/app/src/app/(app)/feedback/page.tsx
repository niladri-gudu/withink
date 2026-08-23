import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { isDateString } from "@/lib/utils/date";
import { PageHeader } from "@/features/app-shell/components/page-header";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";

export const metadata: Metadata = {
  title: "Feedback",
  description:
    "Send feedback, report bugs, or share feature requests directly with the team.",
};

export default async function FeedbackPage() {
  const session = await getRequestSession();

  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      <PageHeader
        runningHead="Feedback"
        note="a note for the hands that built it"
        title="Share your"
        accent="thoughts."
        description="Report an issue, suggest an idea, or simply tell us how it feels."
        today={isDateString(cookieToday) ? cookieToday : undefined}
      />

      <FeedbackForm />
    </div>
  );
}
