import { beforeEach, describe, expect, it, vi } from "vitest";

// The SDK is mocked so no network or real client construction happens.
const checkoutCreate = vi.fn();
const portalCreate = vi.fn();

vi.mock("dodopayments", () => ({
  default: class MockDodoPayments {
    checkoutSessions = { create: checkoutCreate };
    customers = { customerPortal: { create: portalCreate } };
  },
}));

// Local env override: keeps this suite independent of the global setup mock.
vi.mock("@/config/env", () => ({
  env: {
    IS_PROD: false,
    BETTER_AUTH_URL: "http://localhost:3000",
    DODO_API_KEY: "dodo-key",
    DODO_PRODUCT_PLUS_MONTHLY: "pdt_plus_monthly",
    DODO_PRODUCT_PLUS_YEARLY: "pdt_plus_yearly",
    DODO_PRODUCT_PRO_MONTHLY: "pdt_pro_monthly",
    DODO_PRODUCT_PRO_YEARLY: "pdt_pro_yearly",
    DODO_PRODUCT_PRO_LIFETIME: "pdt_pro_lifetime",
  },
}));

import {
  DodoService,
  getProductKeyForId,
} from "./dodo-service";

describe("DodoService.createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session with the mapped product, metadata, and return URL", async () => {
    checkoutCreate.mockResolvedValue({
      session_id: "cs_1",
      checkout_url: "https://checkout.example/pay",
    });

    const url = await DodoService.createCheckoutSession({
      productKey: "plus-yearly",
      userId: "user-1",
      email: "writer@example.com",
      name: "Writer",
      returnUrl: "http://localhost:3000/settings",
    });

    expect(url).toBe("https://checkout.example/pay");
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        product_cart: [{ product_id: "pdt_plus_yearly", quantity: 1 }],
        customer: { email: "writer@example.com", name: "Writer" },
        metadata: { userId: "user-1", productKey: "plus-yearly" },
        return_url: "http://localhost:3000/settings",
      }),
    );
  });

  it("throws when Dodo returns no checkout url", async () => {
    checkoutCreate.mockResolvedValue({ session_id: "cs_2", checkout_url: null });
    await expect(
      DodoService.createCheckoutSession({
        productKey: "pro-monthly",
        userId: "user-1",
        email: "w@e.com",
        name: "W",
        returnUrl: "http://x/settings",
      }),
    ).rejects.toThrow("Checkout could not be started");
  });
});

describe("DodoService.createCustomerPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the portal link with a return URL", async () => {
    portalCreate.mockResolvedValue({ link: "https://portal.example/session" });

    const link = await DodoService.createCustomerPortalSession(
      "cus_abc",
      "http://localhost:3000/settings",
    );

    expect(link).toBe("https://portal.example/session");
    expect(portalCreate).toHaveBeenCalledWith("cus_abc", {
      return_url: "http://localhost:3000/settings",
    });
  });

  it("throws when the portal returns no link", async () => {
    portalCreate.mockResolvedValue({ link: null });
    await expect(
      DodoService.createCustomerPortalSession("cus_abc", "http://x"),
    ).rejects.toThrow("Customer portal is unavailable");
  });
});

describe("getProductKeyForId", () => {
  it("reverse-maps known product ids", () => {
    expect(getProductKeyForId("pdt_pro_lifetime")).toBe("pro-lifetime");
    expect(getProductKeyForId("pdt_plus_monthly")).toBe("plus-monthly");
  });

  it("returns null for unknown product ids", () => {
    expect(getProductKeyForId("pdt_mystery")).toBeNull();
    expect(getProductKeyForId("")).toBeNull();
  });
});
