import "server-only";

import { env } from "@/config/env";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { listAllObjects } from "@/lib/r2-list";

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

const isProduction = env.IS_PROD;
const envPrefix = isProduction ? "" : "dev-";

/**
 * Lists the user's media library and derives storage stats from a single R2
 * listing (paginated). Shared by the server-rendered media page and the server
 * actions so the library and stats never trigger two full listings. The quota
 * limit comes from the viewer's plan entitlements.
 */
export async function getMediaLibraryAndStats(userId: string): Promise<{
  files: MediaFile[];
  stats: StorageStats;
}> {
  const prefix = `${envPrefix}journal/${userId}/`;
  const objects = await listAllObjects(env.R2_BUCKET_NAME, prefix);

  const files: MediaFile[] = objects
    .map((obj) => ({
      key: obj.key,
      url: `${env.R2_PUBLIC_URL}/${obj.key}`,
      size: obj.size,
      lastModified: obj.lastModified?.toISOString() || null,
    }))
    .sort((a, b) => (b.lastModified || "").localeCompare(a.lastModified || ""));

  const { mediaStorageBytes } = await EntitlementsService.getEntitlements(
    userId,
  );
  const limitMB = Number((mediaStorageBytes / (1024 * 1024)).toFixed(2));
  const totalSizeBytes = objects.reduce((acc, obj) => acc + obj.size, 0);
  const totalSizeMB = Number((totalSizeBytes / (1024 * 1024)).toFixed(2));

  return {
    files,
    stats: {
      usedMB: totalSizeMB,
      fileCount: objects.length,
      limitMB,
      percentUsed: Number(
        Math.min((totalSizeMB / limitMB) * 100, 100).toFixed(1),
      ),
    },
  };
}
