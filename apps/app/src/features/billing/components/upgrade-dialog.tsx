"use client";

import Link from "next/link";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";

import type { ResolvedPlan } from "../config/plans";
import { useCheckoutRedirect } from "../hooks/use-checkout-redirect";

export type PaywallReason = "storage" | "backfill" | "notebooks";

const COPY: Record<PaywallReason, { title: string; description: string }> = {
  storage: {
    title: "Your photo space is full",
    description:
      "The Free plan includes 100MB of photos. Plus gives you 10GB and Pro gives you 50GB — everything you have stored stays right where it is.",
  },
  backfill: {
    title: "That day is beyond your writing window",
    description:
      "The Free plan opens the last 14 days for writing. Plus extends the window to 90 days, and Pro lifts it entirely. Entries you already wrote are never touched.",
  },
  notebooks: {
    title: "Your shelf is full",
    description:
      "The Free plan keeps one notebook. Plus holds three, and Pro holds ten — every notebook you already have stays exactly as it is.",
  },
};

/** Calm copy for a Pro user at the hard 10-notebook ceiling: nothing to sell. */
const NOTEBOOK_CAP_COPY = {
  title: "That's every shelf we have",
  description:
    "Ten notebooks is the full Pro shelf — and quite a library. To make room, empty one by moving its entries, then delete it.",
} as const;

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which gate tripped — drives the copy so the paywall matches the moment. */
  reason: PaywallReason;
  /**
   * The viewer's resolved plan when known. A Pro user tripping the notebooks
   * gate is AT THE HARD CAP, not under-gated — they get an informational
   * dialog instead of an upsell.
   */
  plan?: ResolvedPlan;
}

/**
 * The paywall moment (MONETIZATION_PLAN.md §5 upgrade-dialog): shown when a
 * plan gate blocks an action the user just attempted. Monthly prices only —
 * yearly billing lives in Settings where the full pricing table provides
 * context.
 */
export function UpgradeDialog({
  open,
  onOpenChange,
  reason,
  plan,
}: UpgradeDialogProps) {
  const { startCheckout, pendingKey } = useCheckoutRedirect();
  const isProAtNotebookCap = reason === "notebooks" && plan === "pro";

  if (isProAtNotebookCap) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{NOTEBOOK_CAP_COPY.title}</DialogTitle>
            <DialogDescription>
              {NOTEBOOK_CAP_COPY.description}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="justify-center"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const copy = COPY[reason];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-1">
          <Button
            variant="outline"
            disabled={pendingKey !== null}
            onClick={() => void startCheckout("plus-monthly")}
            className="justify-between"
          >
            <span>Plus · $4.99 / month</span>
            {pendingKey === "plus-monthly" && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
          </Button>
          <Button
            disabled={pendingKey !== null}
            onClick={() => void startCheckout("pro-monthly")}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Pro · $9.99 / month
            </span>
            {pendingKey === "pro-monthly" && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
          </Button>
        </div>

        <p className="text-caption text-muted-foreground">
          Yearly billing is available in{" "}
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            Settings → Plan &amp; billing
          </Link>
          . Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}
