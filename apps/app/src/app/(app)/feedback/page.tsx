import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
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

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-5xl flex-grow space-y-8 p-6 duration-300 md:p-10">
      <PageHeader
        note="a note for the hands that built it"
        title="Share your"
        accent="thoughts."
        description="Report an issue, suggest an idea, or simply tell us how it feels."
      />

      <FeedbackForm />
    </div>
  );
}
