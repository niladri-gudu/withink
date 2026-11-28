import "server-only";

// web-push v4 is ESM with named exports only — a default import resolves to
// `undefined` at runtime (webpack doesn't fail the build for it).
import { sendNotification, setVapidDetails } from "web-push";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

import { ExpoPushTokenRepository } from "../repositories/expo-push-token-repository";
import { PushSubscriptionRepository } from "../repositories/push-subscription-repository";

export interface PushMessage {
  title: string;
  body: string;
  /** Route to open when the notification is tapped. */
  url: string;
  /** Collapses repeated notifications with the same tag. */
  tag: string;
}

/**
 * Real Web Push endpoints live on a small set of service origins. Treating the
 * stored endpoint as an arbitrary URL turns the server into an SSRF relay, so
 * anything outside this list is rejected at registration and before sending.
 */
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "web.push.apple.com",
  "notify.windows.com",
  "push.microsoft.com",
];

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** True for an HTTPS endpoint on a known push-service origin. */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_PUSH_HOSTS.some((domain) => hostMatches(host, domain));
  } catch {
    return false;
  }
}

let vapidConfigured = false;

/** True when both VAPID keys are present; the web UI hides reminders otherwise. */
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

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts at most 100 messages per request. */
const EXPO_BATCH_SIZE = 100;

interface ExpoTicket {
  status?: string;
  details?: { error?: string };
}

export class PushService {
  /**
   * Sends one payload to every device the user has registered, on both
   * channels: Web Push (VAPID subscriptions) and Expo Push (native tokens).
   * Dead devices are pruned so the next send is cheaper.
   */
  static async sendToUser(
    userId: string,
    message: PushMessage,
  ): Promise<{ sent: number; failed: number }> {
    const [web, expo] = await Promise.all([
      PushService.sendWebPush(userId, message),
      PushService.sendExpoPush(userId, message),
    ]);
    return { sent: web.sent + expo.sent, failed: web.failed + expo.failed };
  }

  private static async sendWebPush(
    userId: string,
    message: PushMessage,
  ): Promise<{ sent: number; failed: number }> {
    if (!ensureVapid()) return { sent: 0, failed: 0 };

    const subscriptions = await PushSubscriptionRepository.listByUser(userId);
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        // Defense in depth for rows stored before the registration check (or
        // written by any future path): never fetch a non-push URL.
        if (!isAllowedPushEndpoint(subscription.endpoint)) {
          failed += 1;
          await PushSubscriptionRepository.deleteById(subscription.id).catch(
            () => {},
          );
          logger.warn("Dropped push subscription with unsupported endpoint", {
            userId,
          });
          return;
        }
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

  /**
   * Expo Push needs no server credentials for the public service; an access
   * token is optional and only used when configured.
   */
  private static async sendExpoPush(
    userId: string,
    message: PushMessage,
  ): Promise<{ sent: number; failed: number }> {
    const devices = await ExpoPushTokenRepository.listByUser(userId);
    if (devices.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < devices.length; i += EXPO_BATCH_SIZE) {
      const batch = devices.slice(i, i + EXPO_BATCH_SIZE);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(
            batch.map((device) => ({
              to: device.token,
              title: message.title,
              body: message.body,
              data: { url: message.url, tag: message.tag },
              sound: "default",
            })),
          ),
        });

        if (!response.ok) {
          failed += batch.length;
          logger.error("Expo push batch rejected", undefined, {
            userId,
            status: response.status,
          });
          continue;
        }

        const payload = (await response.json()) as {
          data?: ExpoTicket | ExpoTicket[];
        };
        const tickets = Array.isArray(payload.data)
          ? payload.data
          : payload.data
            ? [payload.data]
            : [];

        for (let j = 0; j < batch.length; j += 1) {
          const device = batch[j];
          if (!device) {
            failed += 1;
            continue;
          }
          const ticket = tickets[j];
          if (ticket?.status === "ok") {
            sent += 1;
            continue;
          }
          failed += 1;
          if (ticket?.details?.error === "DeviceNotRegistered") {
            // The app was uninstalled or the token rotated: stop sending.
            await ExpoPushTokenRepository.deleteById(device.id).catch(() => {});
          } else {
            logger.error("Expo push notification failed", undefined, {
              userId,
              reason: ticket?.details?.error ?? "unknown",
            });
          }
        }
      } catch (error) {
        failed += batch.length;
        logger.error("Expo push request failed", error as Error, { userId });
      }
    }

    return { sent, failed };
  }
}
