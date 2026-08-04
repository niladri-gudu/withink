"use server";

import { headers } from "next/headers";
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { r2 } from "@/lib/r2";
import { env } from "@/config/env";
import { connectDB } from "@/lib/db/mongoose";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { safeDecrypt } from "@/lib/encryption";
import { handleError } from "@/server/errors";
import { LockService } from "@/features/lock/services/lock-service";

const isProduction = env.IS_PROD;
const envPrefix = isProduction ? "" : "dev-";
const STORAGE_LIMIT_MB = 50;

export interface MediaFile {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
}

export interface StorageStats {
  usedMB: number;
  fileCount: number;
  limitMB: number;
  percentUsed: number;
}

/**
 * Fetches storage statistics for the Media Library
 */
export async function getStorageStatsAction(): Promise<{
  success: boolean;
  data?: StorageStats;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const prefix = `${envPrefix}journal/${session.user.id}/`;

    const command = new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await r2.send(command);

    const totalSizeBytes =
      response.Contents?.reduce((acc, obj) => acc + (obj.Size || 0), 0) || 0;
    const fileCount = response.Contents?.length || 0;
    const totalSizeMB = Number((totalSizeBytes / (1024 * 1024)).toFixed(2));
    const percentUsed = Number(Math.min((totalSizeMB / STORAGE_LIMIT_MB) * 100, 100).toFixed(1));

    return {
      success: true,
      data: {
        usedMB: totalSizeMB,
        fileCount,
        limitMB: STORAGE_LIMIT_MB,
        percentUsed,
      },
    };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Fetches all media files uploaded by the user
 */
export async function getFullMediaLibraryAction(): Promise<{
  success: boolean;
  data?: MediaFile[];
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const prefix = `${envPrefix}journal/${session.user.id}/`;
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: prefix,
      }),
    );

    const files: MediaFile[] =
      response.Contents?.map((file) => ({
        key: file.Key!,
        url: `${env.R2_PUBLIC_URL}/${file.Key}`,
        size: file.Size || 0,
        lastModified: file.LastModified?.toISOString() || null,
      })) || [];

    // Sort by last modified descending (most recent first)
    files.sort((a, b) => {
      const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return timeB - timeA;
    });

    return { success: true, data: files };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Deletes a media file from R2.
 *
 * Zero-knowledge only: journal content is client-encrypted, so the server
 * cannot find or scrub references to the file. The client scrubs affected
 * entries (decrypt -> remove -> re-encrypt -> save) BEFORE calling this
 * action, then this action removes the object from storage.
 */
export async function deleteMediaFileAction(
  fileKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    // Safety check - make sure user is only deleting their own files
    const userPathSegment = `/${session.user.id}/`;
    if (!fileKey.includes(userPathSegment)) {
      return { success: false, error: "You are not authorized to delete this file." };
    }

    // Delete from R2
    await r2.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileKey,
      }),
    );

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Searches user's entries to find which date references this media url.
 */
export async function findEntryForMediaAction(
  url: string,
): Promise<{ success: boolean; date?: string | null; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    await connectDB();
    const entries = await (EntryModel as any).find( // eslint-disable-line @typescript-eslint/no-explicit-any
      { userId: session.user.id },
      { date: 1, contentHtml: 1 },
    ).lean();

    for (const entry of entries) {
      const contentHtml = (safeDecrypt(entry.contentHtml) as string) || "";
      if (contentHtml.includes(url)) {
        return { success: true, date: entry.date };
      }
    }

    return { success: true, date: null };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
