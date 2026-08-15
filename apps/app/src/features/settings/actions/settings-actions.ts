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
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";

const isProduction = env.IS_PROD;
const envPrefix = isProduction ? "" : "dev-";
const DB_NAME = isProduction ? "withink_prod" : "withink_dev";

/**
 * Destructive action to permanently delete user account and all associated data
 */
export async function deleteAccountAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // 1. Delete all journal entries from MongoDB
    await connectDB();
    await (EntryModel as any).deleteMany({ userId });

    // 2. Invalidate cache in Redis
    await EntryRepository.invalidateUserEntryCache(userId);

    // 3. Purge files from Cloudflare R2 bucket (paginated listing so >1,000
    //    objects are fully removed, not silently left orphaned)
    // We clean up two paths: journal files and avatar files
    const prefixes = [
      `${envPrefix}journal/${userId}/`,
      `${envPrefix}avatars/${userId}/`,
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
    const db = client.db(DB_NAME);

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
