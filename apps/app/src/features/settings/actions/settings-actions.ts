/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

import { env } from "@/config/env";
import { client } from "@/lib/db";
import { connectDB } from "@/lib/db/mongoose";
import { r2 } from "@/lib/r2";
import { listAllObjects } from "@/lib/r2-list";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";
import { ClientEncryptionSettingsModel } from "@/features/encryption/repositories/encryption-settings-model";
import { FeedbackModel } from "@/features/feedback/repositories/feedback-model";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";
import { LockSettingsModel } from "@/features/lock/repositories/lock-model";
import { LockService } from "@/features/lock/services/lock-service";

const isProduction = env.IS_PROD;
const envPrefix = isProduction ? "" : "dev-";
const DB_NAME = isProduction ? "withink_prod" : "withink_dev";

/**
 * Destructive action to permanently delete user account and all associated data
 */
export async function deleteAccountAction(password?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // 0. Re-authentication for credential accounts — a briefly-held hijacked
    //    session must not be able to wipe an account with no friction.
    await connectDB();
    const db = client.db(DB_NAME);
    const hasCredential =
      (await db.collection("account").findOne({
        userId,
        providerId: "credential",
      })) !== null;
    if (hasCredential) {
      if (!password) {
        return { success: false, error: "Password required" };
      }
      // Unlimited bcrypt guesses from a hijacked session would be the last
      // step before an irreversible wipe — throttle like every other secret
      // check.
      const attempts = await rateLimit(`delete-account:${userId}`, {
        limit: 5,
        windowSeconds: 300,
      });
      if (!attempts.success) {
        return {
          success: false,
          error: "Too many attempts. Try again in a few minutes.",
        };
      }
      const verified = await LockService.verifyLoginPassword(
        session.user.email,
        password,
      );
      if (!verified) {
        return { success: false, error: "Incorrect password" };
      }
    }

    // 1. Delete all journal entries from MongoDB
    await (EntryModel as any).deleteMany({ userId });

    // 1b. Purge remaining app collections tied to the user: lock settings
    //     (passcode hash), client encryption settings (salt + verification
    //     blob), and feedback records (email + message text).
    await Promise.all([
      (LockSettingsModel as any).deleteMany({ userId }),
      (ClientEncryptionSettingsModel as any).deleteMany({ userId }),
      (FeedbackModel as any).deleteMany({ userId }),
    ]);

    // 2. Invalidate cache in Redis
    await EntryRepository.invalidateUserEntryCache(userId);

    // 3. Purge files from Cloudflare R2 bucket (paginated listing so >1,000
    //    objects are fully removed, not silently left orphaned).
    // All three user namespaces are purged: journal files, avatars, and
    // system uploads (feedback/issue screenshots). Leaving system/ behind
    // would keep account-tied attachments alive after deletion.
    const prefixes = [
      `${envPrefix}journal/${userId}/`,
      `${envPrefix}avatars/${userId}/`,
      `${envPrefix}system/${userId}/`,
    ];

    for (const prefix of prefixes) {
      const objects = await listAllObjects(env.R2_BUCKET_NAME, prefix);

      // Delete in batches of 1,000 (S3 DeleteObjects limit)
      for (let i = 0; i < objects.length; i += 1000) {
        const batch = objects.slice(i, i + 1000);
        const deleteKeys = batch.map((obj) => ({ Key: obj.key }));
        if (deleteKeys.length === 0) continue;
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME,
          Delete: { Objects: deleteKeys },
        });
        await r2.send(deleteCommand);
      }
    }

    // 4. Delete user collections in Better Auth via MongoClient directly

    // Better Auth standard collections: user, session, account
    // Better Auth stores the user ID as string in both `id` and `_id` fields (depending on DB configuration)
    await db.collection("user").deleteOne({ id: userId });
    await db.collection("user").deleteOne({ _id: userId as any });

    await db.collection("session").deleteMany({ userId });
    await db.collection("account").deleteMany({ userId });

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    logger.error("Failed to delete account", err as Error);
    return { success: false, error: appError.safeMessage };
  }
}
