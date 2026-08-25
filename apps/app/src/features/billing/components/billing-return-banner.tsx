"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, PartyPopper, X } from "lucide-react";

/**
 * Post-checkout feedback (MONETIZATION_PLAN.md Phase D): Dodo redirects back
 * to /settings with a `status` query param. We surface the outcome once as an
 * inline banner and immediately strip the query so refresh/back never reshow
 * it. Rendered inside Suspense — useSearchParams opts out of static rendering.
 */
export function BillingReturnBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [kind, setKind] = useState<"success" | "cancelled" | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const status = (searchParams.get("status") ?? "").toLowerCase();
    let next: "success" | "cancelled" | null = null;
    if (status.includes("cancel")) next = "cancelled";
    else if (status.includes("succe")) next = "success";

    if (next) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- value comes from the URL, only known after hydration
      setKind(next);
      router.replace("/settings", { scroll: false });
    }
  }, [searchParams, router]);

  if (!kind || dismissed) return null;

  const copy =
    kind === "success"
      ? {
          Icon: PartyPopper,
          title: "Payment received",
          body: "Your plan is active — new limits apply right away. Welcome aboard.",
        }
      : {
          Icon: CircleAlert,
          title: "Checkout cancelled",
          body: "No charge was made. You can upgrade anytime from Plan & billing.",
        };

  return (
    <div
      role="status"
      className={
        kind === "success"
          ? "border-accent/30 bg-accent/[0.06] flex items-start gap-3 rounded-xl border p-4"
          : "border-border bg-secondary/40 flex items-start gap-3 rounded-xl border p-4"
      }
    >
      <copy.Icon
        aria-hidden="true"
        className={
          kind === "success"
            ? "mt-0.5 h-5 w-5 shrink-0 text-accent"
            : "text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-body-small text-foreground font-medium">
          {copy.title}
        </p>
        <p className="text-caption">{copy.body}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="focus-visible:ring-ring text-muted-foreground hover:text-foreground -mt-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
