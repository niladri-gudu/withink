import "server-only";

import { env } from "@/config/env";
import { DB_NAME, client } from "@/lib/db";
import { resend } from "@/lib/email";
import { logger } from "@/server/logger";

import { EntitlementsService } from "./entitlements-service";

/**
 * Device soft-kick (Gate #3): enforces the plan's concurrent-session cap
 * (Free 1 · Plus 3 · Pro/Lifetime unlimited) after each new sign-in.
 *
 * The newest session is the one just created, so deleting the OLDEST active
 * sessions never locks the person who just signed in out — it signs their
 * older devices out instead. Best-effort by contract: any failure here is
 * logged and swallowed so authentication can never be blocked by billing.
 */
export class SessionCapService {
  static async enforceOnSessionCreate(userId: string): Promise<void> {
    try {
      const { maxConcurrentSessions } =
        await EntitlementsService.getEntitlements(userId);
      // Infinity = unlimited devices (Pro/Lifetime) — nothing to do.
      if (!Number.isFinite(maxConcurrentSessions)) return;

      // Better Auth's mongodb adapter persists sessions and users in flat
      // collections ("session", "user"). Raw client here (not Mongoose) —
      // these are auth-owned documents, not app-domain models.
      const db = client.db(DB_NAME);
      const sessions = db.collection("session");

      const count = await sessions.countDocuments({ userId });
      const excess = count - maxConcurrentSessions;
      if (excess <= 0) return;

      const oldest = await sessions
        .find({ userId })
        .sort({ createdAt: 1 })
        .limit(excess)
        .project({ _id: 1 })
        .toArray();

      const result = await sessions.deleteMany({
        _id: { $in: oldest.map((doc) => doc._id) },
      });

      if (result.deletedCount > 0) {
        logger.info("Soft-kicked oldest sessions (device cap)", {
          userId,
          deleted: result.deletedCount,
          cap: maxConcurrentSessions,
        });
        await this.sendCourtesyEmail(userId);
      }
    } catch (error) {
      logger.warn(
        "[Billing] Device soft-kick skipped",
        undefined,
        error as Error,
      );
    }
  }

  /**
   * Best-effort notice so a kicked device is never a mystery ("why was I
   * signed out?"). A failed email must never surface — the enforcement
   * itself already succeeded.
   */
  private static async sendCourtesyEmail(userId: string): Promise<void> {
    try {
      const user = await client
        .db(DB_NAME)
        .collection("user")
        .findOne(
          { id: userId },
          { projection: { email: 1, name: 1 } },
        );
      if (!user?.email) return;

      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "New device sign-in - withink.",
        text:
          `${user.name || "friend"},\n\n` +
          "You just signed in on a new device, so your oldest signed-in " +
          "device has been signed out of withink.\n\n" +
          "You can sign back in on that device anytime.\n",
      });
    } catch (error) {
      logger.warn(
        "[Billing] Courtesy sign-out email failed",
        undefined,
        error as Error,
      );
    }
  }
}
