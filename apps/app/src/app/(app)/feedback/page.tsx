import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
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
      <header className="space-y-1">
        <span className="text-muted-foreground/60 block font-mono text-[10px] tracking-[0.25em] uppercase">
          Direct Channel • Feedback Loop
        </span>
        <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          Share your{" "}
          <span className="text-primary mt-1 block pl-1 text-4xl font-light italic sm:mt-0 sm:inline sm:text-5xl">
            thoughts.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Report an issue, suggest an idea, or simply tell us how it feels.
        </p>
      </header>

      <FeedbackForm />
    </div>
  );
}
