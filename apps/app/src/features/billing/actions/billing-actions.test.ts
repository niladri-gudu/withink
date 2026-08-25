/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock session, rate limiting, and every collaborator the actions touch.
vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/server/errors", () => ({
  handleError: vi.fn(() => ({ safeMessage: "Something went wrong." })),
}));

vi.mock("@/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/features/billing/services/dodo-service", () => ({
  DodoService: {
    createCheckoutSession: vi.fn(),
    createCustomerPortalSession: vi.fn(),
  },
  // Defined inside the factory: vi.mock is hoisted above top-level consts.
  BillingNotConfiguredError: class extends Error {
    constructor() {
      super("Billing is not available right now. Please try again later.");
      this.name = "BillingNotConfiguredError";
    }
  },
}));

vi.mock("@/features/billing/services/entitlements-service", () => ({
  // Mirrors the real resolution rules; the summary derives the plan from
  // the stored record through this function.
  resolvePlanFromAccount: (account: {
    plan: string;
    status: string;
  } | null) => {
    if (!account) return "free";
    if (account.status === "canceled") return "free";
    if (account.plan === "plus" || account.plan === "pro")
      return account.plan;
    return "free";
  },
}));

vi.mock("@/features/billing/repositories/billing-account-repository", () => ({
  BillingAccountRepository: {
    getByUserId: vi.fn().mockResolvedValue(null),
    getByDodoCustomerId: vi.fn().mockResolvedValue(null),
  },
}));

import { getRequestSession } from "@/lib/request-cache";
import { BillingAccountRepository } from "@/features/billing/repositories/billing-account-repository";
import {
  BillingNotConfiguredError,
  DodoService,
} from "@/features/billing/services/dodo-service";
import { rateLimit } from "@/server/rate-limit";

import {
  createCheckoutAction,
  getBillingSummaryAction,
  openCustomerPortalAction,
} from "./billing-actions";

const mockUserId = "user-123";
const mockSession = { user: { id: mockUserId, email: "w@e.com", name: "" } };

describe("createCheckoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({ success: true } as any);
  });

  it("rejects unauthenticated users", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null as any);
    const res = await createCheckoutAction("plus-monthly");
    expect(res.success).toBe(false);
    expect(DodoService.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects unknown product keys without calling Dodo", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    const res = await createCheckoutAction("diamond-forever");
    expect(res.success).toBe(false);
    expect(DodoService.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects when rate limited", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(rateLimit).mockResolvedValue({ success: false } as any);
    const res = await createCheckoutAction("plus-monthly");
    expect(res.success).toBe(false);
    expect(DodoService.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates checkout with server-resolved product and returns the URL", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(DodoService.createCheckoutSession).mockResolvedValue(
      "https://checkout.example/pay",
    );

    const res = await createCheckoutAction("plus-monthly");

    expect(res).toEqual({ success: true, url: "https://checkout.example/pay" });
    expect(DodoService.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productKey: "plus-monthly",
        userId: mockUserId,
        email: "w@e.com",
        returnUrl: expect.stringContaining("/settings"),
      }),
    );
  });

  it("surfaces a friendly message when billing is not configured", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(DodoService.createCheckoutSession).mockRejectedValue(
      new BillingNotConfiguredError(),
    );
    const res = await createCheckoutAction("plus-monthly");
    expect(res.success).toBe(false);
    expect(res.error).toContain("not available");
  });
});

describe("openCustomerPortalAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains when there is nothing to manage", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(BillingAccountRepository.getByUserId).mockResolvedValue(
      null as any,
    );
    const res = await openCustomerPortalAction();
    expect(res.success).toBe(false);
    expect(DodoService.createCustomerPortalSession).not.toHaveBeenCalled();
  });

  it("returns the portal link for existing customers", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(BillingAccountRepository.getByUserId).mockResolvedValue({
      dodoCustomerId: "cus_abc",
    } as any);
    vi.mocked(DodoService.createCustomerPortalSession).mockResolvedValue(
      "https://portal.example/session",
    );

    const res = await openCustomerPortalAction();
    expect(res).toEqual({
      success: true,
      url: "https://portal.example/session",
    });
    expect(DodoService.createCustomerPortalSession).toHaveBeenCalledWith(
      "cus_abc",
      expect.stringContaining("/settings"),
    );
  });
});

describe("getBillingSummaryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("summarizes the account with an ISO period end and portal flag", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(BillingAccountRepository.getByUserId).mockResolvedValue({
      userId: mockUserId,
      plan: "plus",
      status: "active",
      interval: "yearly",
      dodoCustomerId: "cus_abc",
      dodoSubscriptionId: "sub_1",
      currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await getBillingSummaryAction();

    expect(res.success).toBe(true);
    expect(res.summary).toEqual({
      plan: "plus",
      status: "active",
      interval: "yearly",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      hasPortal: true,
    });
  });

  it("defaults to a free summary when no billing record exists", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(BillingAccountRepository.getByUserId).mockResolvedValue(
      null as any,
    );

    const res = await getBillingSummaryAction();

    expect(res.summary).toMatchObject({
      plan: "free",
      status: null,
      interval: null,
      currentPeriodEnd: null,
      hasPortal: false,
    });
  });
});
