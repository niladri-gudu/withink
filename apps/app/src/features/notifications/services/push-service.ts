import "server-only";

// web-push v4 is ESM with named exports only — a default import resolves to
// `undefined` at runtime (webpack doesn't fail the build for it).
import { sendNotification, setVapidDetails } from "web-push";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

import { PushSubscriptionRepository } from "../repositories/push-subscription-repository";

export interface PushMessage {
  title: string;
  body: string;
  /** Route to open when the notification is tapped. */
  url: string;
  /** Collapses repeated notifications with the same tag. */
  tag: string;
}

let vapidConfigured = false;

/** True when both VAPID keys are present; the UI hides reminders otherwise. */
export function isPushConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

function ensureVapid(): boolean {
  if (!isPushConfigured()) return false;
  if (!vapidConfigured) {
    setVapidDetails(
      env.VAPID_SUBJECT ?? `mailto:${env.CONTACT_EMAIL}`,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    );
    vapidConfigured = true;
  }
  return true;
}

/** Never log or store full endpoints: they are capability tokens. */
function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}

export class PushService {
  /**
   * Sends one payload to every device the user has registered. Expired
   * subscriptions (404/410) are pruned so the next send is cheaper.
   */
  static async sendToUser(
    userId: string,
    message: PushMessage,
  ): Promise<{ sent: number; failed: number }> {
    if (!ensureVapid()) return { sent: 0, failed: 0 };

    const subscriptions = await PushSubscriptionRepository.listByUser(userId);
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(message),
            { TTL: 60 * 60 },
          );
          sent += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Device unsubscribed or the endpoint expired.
            await PushSubscriptionRepository.deleteById(subscription.id).catch(
              () => {},
            );
          } else {
            failed += 1;
            logger.error("Push notification failed", error as Error, {
              userId,
              endpointHost: endpointHost(subscription.endpoint),
            });
          }
        }
      }),
    );

    return { sent, failed };
  }
}
