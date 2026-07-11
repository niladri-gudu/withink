import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Send feedback, report bugs, or share feature requests directly with the team.",
};
import { FeedbackForm } from "@/features/feedback/components/feedback-form";

export default async function FeedbackPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      <header className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
          Direct Channel • Feedback Loop
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">
          Share your{" "}
          <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
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
