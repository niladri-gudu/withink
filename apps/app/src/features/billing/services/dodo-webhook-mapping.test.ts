import { describe, expect, it } from "vitest";

import type { PlanProductKey } from "../config/plans";
import {
  mapWebhookEvent,
  type BillingPatch,
} from "./dodo-webhook-mapping";

type AnyPayload = Record<string, unknown>;

/** Minimal Subscription payload carrying only the fields the mapper reads. */
function subscriptionEvent(
  type: string,
  overrides: AnyPayload = {},
): AnyPayload {
  return {
    type,
    data: {
      payload_type: "Subscription",
      subscription_id: "sub_123",
      product_id: "pdt_plus_monthly",
      customer: { customer_id: "cus_abc" },
      metadata: { userId: "user-1" },
      next_billing_date: "2026-09-01T00:00:00Z",
      ...overrides,
    },
  };
}

function paymentEvent(type: string, overrides: AnyPayload = {}): AnyPayload {
  return {
    type,
    data: {
      payload_type: "Payment",
      payment_id: "pay_123",
      customer: { customer_id: "cus_abc" },
      metadata: { userId: "user-1" },
      subscription_id: null,
      product_cart: [{ product_id: "pdt_pro_lifetime", quantity: 1 }],
      ...overrides,
    },
  };
}

const PRODUCT_BY_ID: Record<string, PlanProductKey> = {
  pdt_plus_monthly: "plus-monthly",
  pdt_pro_monthly: "pro-monthly",
  pdt_pro_lifetime: "pro-lifetime",
};

const resolve = (productId: string): PlanProductKey | null =>
  PRODUCT_BY_ID[productId] ?? null;

describe("mapWebhookEvent", () => {
  describe("subscription events", () => {
    it.each([
      "subscription.active",
      "subscription.renewed",
      "subscription.plan_changed",
      "subscription.updated",
      "subscription.unpaused",
    ])("activates on %s with plan shape from the product", (type) => {
      const result = mapWebhookEvent(
        subscriptionEvent(type) as never,
        resolve,
      );
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-1");
      expect(result!.dodoCustomerId).toBe("cus_abc");
      expect(result!.dodoSubscriptionId).toBe("sub_123");
      expect(result!.patch).toEqual({
        plan: "plus",
        interval: "monthly",
        lifetime: false,
        status: "active",
        currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
      } satisfies BillingPatch);
    });

    it.each(["subscription.cancelled", "subscription.expired"])(
      "cancels on %s",
      (type) => {
        const result = mapWebhookEvent(
          subscriptionEvent(type) as never,
          resolve,
        );
        expect(result!.patch.status).toBe("canceled");
        expect(result!.patch.currentPeriodEnd).toBeNull();
      },
    );

    it.each(["subscription.failed", "subscription.on_hold", "subscription.paused"])(
      "marks past_due on %s without touching the plan",
      (type) => {
        const result = mapWebhookEvent(
          subscriptionEvent(type) as never,
          resolve,
        );
        expect(result!.patch).toEqual({ status: "past_due" });
      },
    );

    it("ignores subscriptions for products we don't own", () => {
      const result = mapWebhookEvent(
        subscriptionEvent("subscription.active", {
          product_id: "pdt_someone_else",
        }) as never,
        resolve,
      );
      expect(result).toBeNull();
    });

    it("ignores informational subscription events", () => {
      const result = mapWebhookEvent(
        subscriptionEvent("subscription.update_payment_method") as never,
        resolve,
      );
      expect(result).toBeNull();
    });
  });

  describe("payment events", () => {
    it("grants lifetime Pro on a lifetime purchase", () => {
      const result = mapWebhookEvent(
        paymentEvent("payment.succeeded") as never,
        resolve,
      );
      expect(result!.patch).toEqual({
        plan: "pro",
        lifetime: true,
        interval: null,
        status: "active",
      } satisfies BillingPatch);
      expect(result!.userId).toBe("user-1");
    });

    it("restores an active status on a subscription renewal payment", () => {
      const result = mapWebhookEvent(
        paymentEvent("payment.succeeded", {
          subscription_id: "sub_123",
          product_cart: [{ product_id: "pdt_plus_monthly", quantity: 1 }],
        }) as never,
        resolve,
      );
      // Period end belongs to subscription.* events — payment must not set it.
      expect(result!.patch).toEqual({ status: "active" });
      expect(result!.dodoSubscriptionId).toBe("sub_123");
    });

    it("ignores succeeded one-off payments that grant nothing", () => {
      const result = mapWebhookEvent(
        paymentEvent("payment.succeeded", {
          product_cart: [{ product_id: "pdt_unknown_oneoff", quantity: 1 }],
        }) as never,
        resolve,
      );
      expect(result).toBeNull();
    });

    it("marks past_due on a failed subscription payment", () => {
      const result = mapWebhookEvent(
        paymentEvent("payment.failed", {
          subscription_id: "sub_123",
        }) as never,
        resolve,
      );
      expect(result!.patch).toEqual({ status: "past_due" });
    });

    it("ignores failed one-off payments", () => {
      const result = mapWebhookEvent(
        paymentEvent("payment.failed") as never,
        resolve,
      );
      expect(result).toBeNull();
    });

    it("ignores processing and cancelled payments", () => {
      expect(
        mapWebhookEvent(paymentEvent("payment.processing") as never, resolve),
      ).toBeNull();
      expect(
        mapWebhookEvent(paymentEvent("payment.cancelled") as never, resolve),
      ).toBeNull();
    });
  });

  describe("refund events", () => {
    it("treats a successful refund as cancellation", () => {
      const result = mapWebhookEvent(
        {
          type: "refund.succeeded",
          data: {
            payload_type: "Refund",
            refund_id: "ref_1",
            payment_id: "pay_1",
            customer: { customer_id: "cus_abc" },
            metadata: {},
            status: "succeeded",
          },
        } as never,
        resolve,
      );
      expect(result!.patch.status).toBe("canceled");
      expect(result!.dodoCustomerId).toBe("cus_abc");
    });
  });

  describe("unhandled payloads", () => {
    it("returns null for dispute, payout, license key, and credit events", () => {
      const types = [
        ["dispute.opened", { payload_type: "Dispute" }],
        ["payout.created", { payload_type: "Payout" }],
        ["license_key.created", { payload_type: "LicenseKey" }],
        ["credit.added", { payload_type: "CreditLedgerEntry" }],
      ] as const;
      for (const [type, data] of types) {
        expect(mapWebhookEvent({ type, data } as never, resolve)).toBeNull();
      }
    });

    it("propagates attribution only when metadata carries a userId", () => {
      const result = mapWebhookEvent(
        subscriptionEvent("subscription.active", { metadata: {} }) as never,
        resolve,
      );
      expect(result!.userId).toBeUndefined();
      expect(result!.dodoCustomerId).toBe("cus_abc");
    });
  });
});
