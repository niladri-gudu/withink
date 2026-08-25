import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

import { env } from "@/config/env";
import { BillingAccountRepository } from "@/features/billing/repositories/billing-account-repository";
import { getProductKeyForId } from "@/features/billing/services/dodo-service";
import {
  mapWebhookEvent,
  type MappedBillingEvent,
} from "@/features/billing/services/dodo-webhook-mapping";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { logger } from "@/server/logger";

// Webhook payloads are small JSON documents; anything larger is not a Dodo
// event and parsing it would only waste memory on a hostile body.
const MAX_BODY_BYTES = 1024 * 1024; // 1MB

// How long a processed webhook id is remembered. Dodo retries failed
// deliveries for days; past this window a replay is harmless anyway because
// every write below is an upsert (idempotent by construction).
const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Dodo Payments webhook receiver (MONETIZATION_PLAN.md §7).
 *
 * Security posture: the signature is verified against the raw body with a
 * timing-safe HMAC comparison before any parse; userId always comes from
 * checkout metadata or our own billing record — never from unverified
 * payload fields.
 */
export async function POST(request: Request) {
  if (!env.DODO_WEBHOOK_SECRET) {
    // Unconfigured deployments must not look like a valid endpoint.
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const headers: Record<string, string> = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  try {
    await new Webhook(env.DODO_WEBHOOK_SECRET).verify(rawBody, headers);
  } catch {
    logger.warn("Rejected Dodo webhook with invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const eventId = headers["webhook-id"] || undefined;
  const eventType =
    typeof payload === "object" && payload !== null && "type" in payload
      ? String((payload as { type: unknown }).type)
      : "unknown";

  if (!(await claimOnce(eventId))) {
    // Already applied — ack so Dodo stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  const mapped = mapWebhookEvent(
    payload as Parameters<typeof mapWebhookEvent>[0],
    getProductKeyForId,
  );
  if (!mapped) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    await applyBillingEvent(mapped);
  } catch (error) {
    logger.error("Failed to apply Dodo billing event", error as Error, {
      eventType,
    });
    // Release the claim so Dodo's retry can apply it again.
    await releaseClaim(eventId);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  logger.info("Applied Dodo billing event", { eventType });
  return NextResponse.json({ received: true });
}

/**
 * Marks an event as being processed via Redis SET NX. Returns false when the
 * event was already claimed. Without Redis this degrades to "always true":
 * correctness is preserved regardless because all writes are idempotent
 * upserts — dedupe merely avoids redundant writes.
 */
async function claimOnce(eventId: string | undefined): Promise<boolean> {
  const { redis } = await import("@/lib/redis");
  if (!redis || !eventId) return true;
  try {
    return (await redis.set(`billing:webhook:${eventId}`, "1", {
      ex: IDEMPOTENCY_TTL_SECONDS,
      nx: true,
    })) === "OK";
  } catch {
    return true;
  }
}

/** Best-effort: lets a failed application be retried by Dodo. */
async function releaseClaim(eventId: string | undefined): Promise<void> {
  try {
    const { redis } = await import("@/lib/redis");
    if (redis && eventId) await redis.del(`billing:webhook:${eventId}`);
  } catch {
    // The TTL self-heals any stale claim.
  }
}

async function applyBillingEvent(mapped: MappedBillingEvent): Promise<void> {
  // Attribute the event: verified metadata first, then our own records.
  // Never trust a bare customer/user id supplied only by the payload.
  let userId = mapped.userId;
  if (!userId && mapped.dodoCustomerId) {
    userId =
      (
        await BillingAccountRepository.getByDodoCustomerId(
          mapped.dodoCustomerId,
        )
      )?.userId ?? undefined;
  }
  if (!userId) {
    logger.warn(
      "Dodo billing event could not be attributed to a user",
      { dodoCustomerId: mapped.dodoCustomerId ?? "unknown" },
    );
    return;
  }

  await BillingAccountRepository.upsertByUserId(userId, {
    ...mapped.patch,
    ...(mapped.dodoCustomerId ? { dodoCustomerId: mapped.dodoCustomerId } : {}),
    ...(mapped.dodoSubscriptionId
      ? { dodoSubscriptionId: mapped.dodoSubscriptionId }
      : {}),
  });

  // Gates read through the entitlements cache — drop it immediately.
  await EntitlementsService.invalidateCache(userId);
}
