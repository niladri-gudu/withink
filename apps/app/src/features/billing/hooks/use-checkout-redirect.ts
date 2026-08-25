"use client";

import * as React from "react";
import { toast } from "sonner";

import { createCheckoutAction } from "../actions/billing-actions";

/**
 * Shared checkout flow for every upgrade surface (settings card, paywall
 * dialog): calls the server action and redirects to Dodo's hosted page.
 * Exposes which product key is mid-flight so callers can show spinners.
 */
export function useCheckoutRedirect() {
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  const startCheckout = React.useCallback(async (productKey: string) => {
    setPendingKey(productKey);
    const res = await createCheckoutAction(productKey);
    if (res.success && res.url) {
      // Hosted checkout takes over from here.
      window.location.assign(res.url);
      return;
    }
    toast.error(res.error || "Checkout could not be started.");
    setPendingKey(null);
  }, []);

  return { startCheckout, pendingKey };
}
