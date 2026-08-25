"use server";

import { z } from "zod";

import { LIMITS } from "@/constants/limits";
import { env } from "@/config/env";
import { resolvePlanFromAccount } from "@/features/billing/services/entitlements-service";
import type { ResolvedPlan } from "@/features/billing/config/plans";
import { BillingAccountRepository } from "@/features/billing/repositories/billing-account-repository";
import {
  BillingNotConfiguredError,
  DodoService,
} from "@/features/billing/services/dodo-service";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";

export type BillingActionResult = {
  success: boolean;
  url?: string;
  error?: string;
};

const productKeySchema = z.enum([
  "plus-monthly",
  "plus-yearly",
  "pro-monthly",
  "pro-yearly",
] as const);

/**
 * Current plan state for the settings card. Dates are ISO strings so the
 * value crosses the server/client boundary without serialization surprises.
 */
export interface BillingSummary {
  plan: ResolvedPlan;
  status: "active" | "canceled" | "past_due" | null;
  interval: "monthly" | "yearly" | null;
  currentPeriodEnd: string | null;
  /** Whether a Dodo customer-portal link can be opened for this account. */
  hasPortal: boolean;
}

function settingsReturnUrl(): string {
  return `${env.BETTER_AUTH_URL}/settings`;
}

/**
 * Creates a hosted Dodo checkout session and returns its redirect URL.
 * Authenticated + rate-limited; the product id never comes from the client —
 * only the product key, which is resolved server-side from env.
 */
export async function createCheckoutAction(
  input: unknown,
): Promise<BillingActionResult> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "You must be signed in." };
    }
    const userId = session.user.id;

    const parsed = productKeySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Unknown plan selected." };
    }

    // Creating checkout sessions hits a paid third-party API — cap abuse.
    const limit = await rateLimit(`checkout:${userId}`, {
      limit: LIMITS.BILLING.CHECKOUT_RATE_LIMIT_MAX,
      windowSeconds: LIMITS.BILLING.CHECKOUT_RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!limit.success) {
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
      };
    }

    const url = await DodoService.createCheckoutSession({
      productKey: parsed.data,
      userId,
      email: session.user.email,
      name: session.user.name || "Writer",
      returnUrl: settingsReturnUrl(),
    });

    return { success: true, url };
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      return { success: false, error: error.message };
    }
    const appError = handleError(error);
    logger.error(
      "Checkout creation failed",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}

/** Opens the Dodo customer portal (manage card, cancel, invoices). */
export async function openCustomerPortalAction(): Promise<BillingActionResult> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "You must be signed in." };
    }

    const account = await BillingAccountRepository.getByUserId(
      session.user.id,
    );
    if (!account?.dodoCustomerId) {
      return {
        success: false,
        error: "No subscription found to manage yet.",
      };
    }

    const url = await DodoService.createCustomerPortalSession(
      account.dodoCustomerId,
      settingsReturnUrl(),
    );

    return { success: true, url };
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      return { success: false, error: error.message };
    }
    const appError = handleError(error);
    logger.error(
      "Customer portal session failed",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Plan state for the settings card. Reads through the entitlements cache, so
 * it stays cheap enough to render on every settings visit.
 */
export async function getBillingSummaryAction(): Promise<
  BillingActionResult & { summary?: BillingSummary }
> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "You must be signed in." };
    }

    const userId = session.user.id;
    const account = await BillingAccountRepository.getByUserId(userId);

    return {
      success: true,
      summary: {
        plan: account
          ? resolvePlanFromAccount(account)
          : "free",
        status: account?.status ?? null,
        interval: account?.interval ?? null,
        currentPeriodEnd: account?.currentPeriodEnd
          ? new Date(account.currentPeriodEnd).toISOString()
          : null,
        hasPortal: !!account?.dodoCustomerId,
      },
    };
  } catch (error) {
    const appError = handleError(error);
    logger.error(
      "Billing summary failed",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}
