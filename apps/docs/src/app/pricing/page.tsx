import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@withink/ui/button";

// Same resolution as the landing page — the dashboard app's public URL.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.IS_PROD === "true"
    ? "https://app.withink.me"
    : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Pricing - withink.",
  description:
    "Free forever for reading and writing. Upgrade for longer memory, more photo storage, and more devices.",
  alternates: {
    canonical: "/pricing",
  },
};

interface PlanCard {
  name: string;
  price: string;
  period: string;
  tagline: string;
  cta: string;
  featured?: boolean;
  features: string[];
}

// Canonical tier structure lives in internal-docs/MONETIZATION_PLAN.md §2 —
// update both together.
const PLANS: PlanCard[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to keep a private diary.",
    cta: "Start writing",
    features: [
      "Unlimited entries & words",
      "Read & edit anytime",
      "14-day backfill window",
      "1 device at a time",
      "100MB photos",
      "Zero-knowledge encryption",
      "Search, tags & offline",
    ],
  },
  {
    name: "Plus",
    price: "$4.99",
    period: "per month · $39/yr",
    tagline: "A longer memory and room to grow.",
    cta: "Upgrade to Plus",
    features: [
      "90-day backfill window",
      "3 devices",
      "10GB photos",
      "Weekly digest & reminders*",
      "Standard PDF export*",
      "Letters to future self (3)*",
    ],
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "per month · $79/yr",
    tagline: "No limits on anything.",
    cta: "Go Pro",
    featured: true,
    features: [
      "Unlimited backfill",
      "Unlimited devices",
      "50GB photos",
      "Custom PDF layouts*",
      "Voice notes, E2EE audio*",
      "Priority support & early betas",
    ],
  },
  {
    name: "Lifetime",
    price: "$199",
    period: "once",
    tagline: "Pro forever. One payment.",
    cta: "Become a founding member",
    features: [
      "Everything in Pro, forever",
      "Founding Member badge",
      "Supporters page opt-in",
      "All future Pro features",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="animate-in fade-in mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-12 px-6 py-10 duration-300 md:py-16">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <Link
          href="/"
          className="text-muted-foreground/80 hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded p-0.5 px-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:ring-1"
        >
          ← Back to Diary
        </Link>
        <h1 className="text-h1 text-foreground font-serif font-bold tracking-tight">
          Simple pricing
        </h1>
        <p className="text-subtitle text-muted-foreground">
          Writing is free — always. Upgrades only add memory, space, and
          convenience. Nothing you created ever gets locked away.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <section
            key={plan.name}
            aria-label={`${plan.name} plan`}
            className={`border-border bg-card flex flex-col rounded-2xl border p-6 ${
              plan.featured ? "border-accent ring-accent/25 shadow-sm ring-1" : ""
            }`}
          >
            <div className="space-y-1 pb-4">
              <h2 className="text-title font-serif font-bold">{plan.name}</h2>
              <p>
                <span className="text-h3 font-serif font-bold">
                  {plan.price}
                </span>{" "}
                <span className="text-caption text-muted-foreground">
                  {plan.period}
                </span>
              </p>
              <p className="text-caption text-muted-foreground pt-1">
                {plan.tagline}
              </p>
            </div>

            <ul className="text-body-small space-y-2.5 border-t border-dashed pt-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-6 mt-auto">
              <Button
                variant={plan.featured ? "default" : "outline"}
                asChild
                className="w-full"
              >
                <a href={`${APP_URL}/login`}>{plan.cta}</a>
              </Button>
            </div>
          </section>
        ))}
      </div>

      <div className="border-border text-body-small text-muted-foreground mx-auto max-w-2xl space-y-3 rounded-xl border p-6 leading-relaxed">
        <p>
          Every plan includes full cloud sync and backup, zero-knowledge
          encryption, diary lock, offline writing, search, tags, and basic
          export. Reading and editing your past entries stays free on every
          tier — forever.
        </p>
        <p>
          Downgrading never locks anything you already made; only new actions
          follow the new plan&apos;s limits.
        </p>
        <p className="text-caption">
          * Included as they ship. Payments are processed by our merchant of
          record; card details never touch withink servers.
        </p>
      </div>
    </div>
  );
}
