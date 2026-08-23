"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { env } from "@/config/env";
import { connectDB } from "@/lib/db/mongoose";
import { safeDecrypt } from "@/lib/encryption";
import { r2 } from "@/lib/r2";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { LockService } from "@/features/lock/services/lock-service";

import {
  getMediaLibraryAndStats,
  type MediaFile,
  type StorageStats,
} from "../services/media-service";

export type { MediaFile, StorageStats } from "../services/media-service";

/**
 * Fetches storage statistics for the Media Library
 */
export async function getStorageStatsAction(): Promise<{
  success: boolean;
  data?: StorageStats;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const { stats } = await getMediaLibraryAndStats(session.user.id);

    return {
      success: true,
      data: stats,
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
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const { files } = await getMediaLibraryAndStats(session.user.id);

    return { success: true, data: files };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Fetches the media library and storage stats in a single round trip (one
 * session/lock check + one R2 listing).
 */
export async function getMediaLibraryAndStatsAction(): Promise<{
  success: boolean;
  data?: { files: MediaFile[]; stats: StorageStats };
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const data = await getMediaLibraryAndStats(session.user.id);
    return { success: true, data };
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
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    // Safety check — strict prefix match against the caller's own namespaces
    // (journal/ and avatars/). A substring containment check would accept a
    // crafted key that merely embeds the user id somewhere in the middle.
    const envPrefix = env.IS_PROD ? "" : "dev-";
    const ownsKey =
      fileKey.startsWith(`${envPrefix}journal/${session.user.id}/`) ||
      fileKey.startsWith(`${envPrefix}avatars/${session.user.id}/`) ||
      fileKey.startsWith(`${envPrefix}system/${session.user.id}/`);
    if (!ownsKey) {
      return {
        success: false,
        error: "You are not authorized to delete this file.",
      };
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
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    // Each call decrypts up to 200 entries — throttle per user so the
    // lightbox can't be scripted into a decryption hammer.
    const limit = await rateLimit(`media-find:${session.user.id}`, {
      limit: 10,
      windowSeconds: 60,
    });
    if (!limit.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    await connectDB();
    // Scan only the most recent entries rather than the entire journal. Media
    // is overwhelmingly referenced by recent entries, and a bounded window
    // keeps this interactive lightbox action fast for long-term users.
    const MAX_ENTRIES_SCANNED = 200;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (EntryModel as any)
      .find({ userId: session.user.id }, { date: 1, contentHtml: 1 })
      .sort({ date: -1 })
      .limit(MAX_ENTRIES_SCANNED)
      .lean();

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
