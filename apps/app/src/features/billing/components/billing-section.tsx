"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { cn } from "@withink/utils";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  createCheckoutAction,
  getBillingSummaryAction,
  openCustomerPortalAction,
  type BillingSummary,
} from "../actions/billing-actions";
import type { PaidPlan, ResolvedPlan } from "../config/plans";

const PLAN_LABEL: Record<ResolvedPlan, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

/** Marketing copy per tier — mirrors internal-docs/MONETIZATION_PLAN.md §2. */
const UPGRADES: Array<{
  key: PaidPlan;
  name: string;
  tagline: string;
  products: Array<{ productKey: string; label: string }>;
}> = [
  {
    key: "plus",
    name: "Plus",
    tagline: "Longer memory, more photos, 3 devices.",
    products: [
      { productKey: "plus-monthly", label: "$4.99 / mo" },
      { productKey: "plus-yearly", label: "$39 / yr" },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "No limits on anything, forever features first.",
    products: [
      { productKey: "pro-monthly", label: "$9.99 / mo" },
      { productKey: "pro-yearly", label: "$79 / yr" },
    ],
  },
];

const STATUS_STYLE: Record<
  NonNullable<BillingSummary["status"]>,
  string
> = {
  active: "bg-accent/15 text-accent-foreground",
  past_due: "bg-destructive/15 text-destructive",
  canceled: "bg-secondary text-muted-foreground",
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "Unlimited";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)}GB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BillingSection() {
  const [summary, setSummary] = React.useState<BillingSummary | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [portalOpening, setPortalOpening] = React.useState(false);

  React.useEffect(() => {
    getBillingSummaryAction()
      .then((res) => {
        if (res.success && res.summary) setSummary(res.summary);
        else setLoadFailed(true);
      })
      .catch(() => setLoadFailed(true));
  }, []);

  const handleCheckout = async (productKey: string) => {
    setPendingKey(productKey);
    const res = await createCheckoutAction(productKey);
    if (res.success && res.url) {
      window.location.assign(res.url);
      return;
    }
    toast.error(res.error || "Checkout could not be started.");
    setPendingKey(null);
  };

  const handlePortal = async () => {
    setPortalOpening(true);
    const res = await openCustomerPortalAction();
    if (res.success && res.url) {
      window.location.assign(res.url);
      return;
    }
    toast.error(res.error || "Could not open the billing portal.");
    setPortalOpening(false);
  };

  // A paid plan can only move up: Free sees every tier, Plus sees Pro,
  // Pro sees nothing (Lifetime is handled separately below).
  const visibleUpgrades = UPGRADES.filter((tier) => {
    if (!summary || summary.plan === "free") return true;
    if (summary.plan === "pro") return false;
    return tier.key !== summary.plan;
  });

  return (
    <div aria-label="Plan and billing">
      {!summary ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current state */}
          <div className="border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-body-small text-foreground font-medium">
                  {summary.lifetime
                    ? "Lifetime"
                    : PLAN_LABEL[summary.plan] + " plan"}
                </p>
                {summary.status && (
                  <span
                    className={cn(
                      "text-caption rounded-full px-2.5 py-0.5 font-medium capitalize",
                      STATUS_STYLE[summary.status],
                    )}
                  >
                    {summary.status === "past_due"
                      ? "payment issue"
                      : summary.status}
                  </span>
                )}
              </div>
              <p className="text-caption">
                {summary.lifetime
                  ? "Pro forever. Thank you for supporting withink."
                  : summary.currentPeriodEnd && summary.status === "active"
                    ? `Renews on ${formatDate(summary.currentPeriodEnd)}`
                    : "Everything you write stays unlimited on every plan."}
              </p>
            </div>
            {summary.hasPortal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handlePortal()}
                disabled={portalOpening}
                className="gap-2"
              >
                {portalOpening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage subscription
              </Button>
            )}
          </div>

          {/* Entitlements at a glance */}
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Backfill", `${summary.plan === "free" ? "14" : summary.plan === "plus" ? "90" : "∞"} days`],
                ["Photos", formatBytes(summary.plan === "free" ? 100 * 1024 * 1024 : summary.plan === "plus" ? 10 * 1024 * 1024 * 1024 : Number.POSITIVE_INFINITY)],
                ["Devices", summary.plan === "free" ? "1" : summary.plan === "plus" ? "3" : "∞"],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="border-border bg-secondary/20 rounded-xl border p-3 text-center sm:p-4"
              >
                <p className="text-caption">{label}</p>
                <p className="text-body-small mt-1 font-serif font-semibold">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Upgrades */}
          {summary.lifetime ? (
            <div className="border-accent/25 bg-accent/5 flex items-start gap-3 rounded-xl border p-5">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="space-y-1">
                <p className="text-body-small text-foreground font-medium">
                  Founding Member
                </p>
                <p className="text-caption">
                  You own withink forever — every future Pro feature included.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleUpgrades.map((tier) => (
                <div
                  key={tier.key}
                  className={cn(
                    "border-border flex flex-col gap-4 rounded-xl border p-5",
                    tier.key === "pro" && "border-accent/40 bg-accent/[0.04]",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {tier.key === "pro" && (
                        <Sparkles className="h-4 w-4 text-accent" />
                      )}
                      <p className="text-foreground font-serif text-base font-semibold">
                        {tier.name}
                      </p>
                    </div>
                    <p className="text-caption">{tier.tagline}</p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    {tier.products.map((product) => (
                      <Button
                        key={product.productKey}
                        variant={tier.key === "pro" ? "default" : "outline"}
                        size="sm"
                        disabled={pendingKey !== null}
                        onClick={() =>
                          void handleCheckout(product.productKey)
                        }
                        className="justify-between"
                      >
                        <span>{product.label}</span>
                        {pendingKey === product.productKey && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Lifetime one-time purchase */}
              {summary.plan !== "pro" && (
                <div className="border-border flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:col-span-2">
                  <div className="space-y-1">
                    <p className="text-foreground font-serif text-base font-semibold">
                      Lifetime
                    </p>
                    <p className="text-caption">
                      Pro forever, one payment — Founding Member badge
                      included.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pendingKey !== null}
                    onClick={() => void handleCheckout("pro-lifetime")}
                    className="sm:self-end"
                  >
                    $199 once
                    {pendingKey === "pro-lifetime" && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="text-caption text-muted-foreground">
            Payments are handled securely by our merchant of record; card
            details never touch withink servers. Reading and editing your
            entries is always free.
          </p>
        </div>
      )}
      {loadFailed && !summary && (
        <p className="text-caption text-destructive">
          Could not load your plan right now.
        </p>
      )}
    </div>
  );
}
