import "server-only";

import DodoPayments from "dodopayments";

import { env, type ServerEnv } from "@/config/env";
import { logger } from "@/server/logger";

import type { PlanProductKey } from "../config/plans";

/** Thrown when billing is not configured (missing Dodo env vars). */
export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Billing is not available right now. Please try again later.");
    this.name = "BillingNotConfiguredError";
  }
}

/**
 * Env var holding each product's Dodo id. Keys mirror PLAN_PRODUCTS in
 * features/billing/config/plans.ts — the two must stay in sync.
 */
const PRODUCT_ENV_KEY: Record<
  PlanProductKey,
  keyof ServerEnv & `DODO_PRODUCT_${string}`
> = {
  "plus-monthly": "DODO_PRODUCT_PLUS_MONTHLY",
  "plus-yearly": "DODO_PRODUCT_PLUS_YEARLY",
  "pro-monthly": "DODO_PRODUCT_PRO_MONTHLY",
  "pro-yearly": "DODO_PRODUCT_PRO_YEARLY",
  "pro-lifetime": "DODO_PRODUCT_PRO_LIFETIME",
};

export function getProductIdForPlan(productKey: PlanProductKey): string | null {
  return env[PRODUCT_ENV_KEY[productKey]] ?? null;
}

/** Reverse lookup: which of our plans does this Dodo product id belong to? */
export function getProductKeyForId(productId: string): PlanProductKey | null {
  const entry = (
    Object.keys(PRODUCT_ENV_KEY) as PlanProductKey[]
  ).find((key) => getProductIdForPlan(key) === productId);
  return entry ?? null;
}

/** True when checkout can actually be created (key + every product mapped). */
export function isBillingConfigured(): boolean {
  if (!env.DODO_API_KEY) return false;
  return (
    Object.keys(PRODUCT_ENV_KEY) as PlanProductKey[]
  ).every((key) => !!getProductIdForPlan(key));
}

// Lazily-created singleton: constructing the client is cheap but reading
// env.DODO_API_KEY throws for unconfigured deployments, so it stays behind
// an explicit guard.
let cachedClient: DodoPayments | null = null;

function getClient(): DodoPayments {
  if (!env.DODO_API_KEY) throw new BillingNotConfiguredError();
  cachedClient ??= new DodoPayments({
    bearerToken: env.DODO_API_KEY,
    // Test mode in every non-prod environment so real money is never touched.
    environment: env.IS_PROD ? "live_mode" : "test_mode",
  });
  return cachedClient;
}

export interface CheckoutRequest {
  productKey: PlanProductKey;
  userId: string;
  email: string;
  name: string;
  /** Where Dodo redirects after payment/cancellation (our /settings page). */
  returnUrl: string;
}

/**
 * Thin wrapper over the Dodo SDK. Server-only; never exposes API keys to the
 * client — all calls originate from server actions or the webhook route.
 */
export class DodoService {
  /**
   * Creates a hosted checkout session and returns its single-use URL.
   * `metadata.userId` is how the webhook attributes a payment to a user —
   * it must always be carried through.
   */
  static async createCheckoutSession(
    request: CheckoutRequest,
  ): Promise<string> {
    const productId = getProductIdForPlan(request.productKey);
    if (!productId || !env.DODO_API_KEY) {
      throw new BillingNotConfiguredError();
    }

    const session = await getClient().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: request.email, name: request.name },
      metadata: {
        userId: request.userId,
        productKey: request.productKey,
      },
      return_url: request.returnUrl,
    });

    if (!session.checkout_url) {
      logger.error("Dodo checkout session returned no checkout_url", undefined, {
        sessionId: session.session_id,
        userId: request.userId,
      });
      throw new Error("Checkout could not be started. Please try again.");
    }

    return session.checkout_url;
  }

  /** Creates a customer-portal session link (manage card, cancel, invoices). */
  static async createCustomerPortalSession(
    dodoCustomerId: string,
    returnUrl: string,
  ): Promise<string> {
    if (!env.DODO_API_KEY) throw new BillingNotConfiguredError();

    const portal = await getClient().customers.customerPortal.create(
      dodoCustomerId,
      { return_url: returnUrl },
    );

    if (!portal.link) {
      throw new Error("Customer portal is unavailable. Please try again.");
    }

    return portal.link;
  }
}
