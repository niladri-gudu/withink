import type DodoPayments from "dodopayments";

import { PLAN_PRODUCTS, type PlanProductKey } from "../config/plans";

type WebhookPayload = DodoPayments.WebhookPayload;

/** Fields of a billing account a webhook event is allowed to change. */
export interface BillingPatch {
  plan?: "free" | "plus" | "pro";
  interval?: "monthly" | "yearly" | null;
  status?: "active" | "canceled" | "past_due";
  currentPeriodEnd?: Date | null;
}

export interface MappedBillingEvent {
  /** User attribution carried through checkout metadata, when present. */
  userId?: string;
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  patch: BillingPatch;
}

/**
 * Maps a verified Dodo webhook event to a billing-account patch, per
 * internal-docs/MONETIZATION_PLAN.md §7. Pure and side-effect free so the
 * event table stays unit-testable without Mongo or Redis.
 *
 * Returns null for events we don't act on (payouts, disputes, license keys,
 * unknown products, …) — the route then acknowledges without writing.
 *
 * `resolveProductKey` translates a Dodo product id into our plan config;
 * events referencing products we don't own are ignored (defense in depth —
 * the webhook secret already guarantees authenticity, this guards mistakes).
 */
export function mapWebhookEvent(
  event: WebhookPayload,
  resolveProductKey: (productId: string) => PlanProductKey | null,
): MappedBillingEvent | null {
  const data = event.data;

  if (data.payload_type === "Subscription") {
    return mapSubscriptionEvent(event.type, data, resolveProductKey);
  }

  if (data.payload_type === "Payment") {
    return mapPaymentEvent(event.type, data);
  }

  if (data.payload_type === "Refund" && event.type === "refund.succeeded") {
    // A refund revokes what was paid: treat exactly like cancellation.
    return {
      userId: asString(data.metadata?.userId),
      dodoCustomerId: data.customer.customer_id,
      patch: { status: "canceled" },
    };
  }

  return null;
}

function mapSubscriptionEvent(
  eventType: string,
  subscription: Extract<WebhookPayload["data"], { payload_type: "Subscription" }>,
  resolveProductKey: (productId: string) => PlanProductKey | null,
): MappedBillingEvent | null {
  const base: MappedBillingEvent = {
    userId: asString(subscription.metadata?.userId),
    dodoCustomerId: subscription.customer.customer_id,
    dodoSubscriptionId: subscription.subscription_id,
    patch: {},
  };

  switch (eventType) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.plan_changed":
    case "subscription.updated":
    case "subscription.unpaused": {
      const productKey = resolveProductKey(subscription.product_id);
      if (!productKey) return null;
      const { plan, interval } = PLAN_SHAPE[productKey];
      base.patch = {
        plan,
        interval,
        status: "active",
        currentPeriodEnd: parseDate(subscription.next_billing_date),
      };
      return base;
    }

    // Dunning / paused: access continues while we wait on Dodo's retries
    // ("past_due" still resolves to a paid tier), but the record stops
    // claiming a healthy active state.
    case "subscription.failed":
    case "subscription.on_hold":
    case "subscription.paused":
      base.patch = { status: "past_due" };
      return base;

    case "subscription.cancelled":
    case "subscription.expired":
      base.patch = { status: "canceled", currentPeriodEnd: null };
      return base;

    default:
      return null;
  }
}

function mapPaymentEvent(
  eventType: string,
  payment: Extract<WebhookPayload["data"], { payload_type: "Payment" }>,
): MappedBillingEvent | null {
  const userId = asString(payment.metadata?.userId);
  const dodoCustomerId = payment.customer.customer_id;
  const dodoSubscriptionId = payment.subscription_id ?? undefined;

  switch (eventType) {
    case "payment.succeeded": {
      // Subscription payment: activation/renewal/recovery. The period end is
      // owned by subscription.* events; here we only restore a healthy state.
      if (!dodoSubscriptionId) return null;
      return {
        userId,
        dodoCustomerId,
        dodoSubscriptionId,
        patch: { status: "active" },
      };
    }

    case "payment.failed":
      // Only meaningful for subscriptions; failed one-offs have nothing to
      // revoke that was ever granted.
      if (!dodoSubscriptionId) return null;
      return {
        userId,
        dodoCustomerId,
        dodoSubscriptionId,
        patch: { status: "past_due" },
      };

    default:
      return null;
  }
}

/**
 * Plan shape per product key, derived from PLAN_PRODUCTS (config/plans.ts) —
 * the single source of truth for what each product grants.
 */
const PLAN_SHAPE = PLAN_PRODUCTS;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
