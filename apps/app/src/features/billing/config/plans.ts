/**
 * Billing product mapping. The entitlement matrix itself lives in
 * `@withink/core/plans` so the web and native clients share one source of
 * truth; this file keeps the Dodo-specific product ids server-side.
 */
import type { PaidPlan } from "@withink/core/plans";

export * from "@withink/core/plans";

/**
 * Dodo Payments product mapping. Keys are stable identifiers shared by the
 * checkout action and the webhook handler; the actual Dodo product ids live
 * in env (see features/billing/services/dodo-service.ts).
 */
export const PLAN_PRODUCTS = {
  "plus-monthly": { plan: "plus", interval: "monthly" },
  "plus-yearly": { plan: "plus", interval: "yearly" },
  "pro-monthly": { plan: "pro", interval: "monthly" },
  "pro-yearly": { plan: "pro", interval: "yearly" },
} as const satisfies Record<
  string,
  { plan: PaidPlan; interval: "monthly" | "yearly" }
>;

export type PlanProductKey = keyof typeof PLAN_PRODUCTS;
