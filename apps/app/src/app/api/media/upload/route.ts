import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { env } from "@/config/env";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { r2 } from "@/lib/r2";
import { listAllObjects } from "@/lib/r2-list";
import { getCachedValue, redis, setCachedValue } from "@/lib/redis";
import { getRequestSession } from "@/lib/request-cache";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";
import { LockService } from "@/features/lock/services/lock-service";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/png",
  "image/gif",
] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file (safety bound, not a tier perk)

// Extensions are derived from the validated MIME type, never from the raw
// filename (attacker-controlled strings don't belong in object keys).
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
  "image/gif": "gif",
};

// Known destination folders only — arbitrary strings must not become key
// path segments under the user prefix.
const ALLOWED_FOLDERS = new Set(["journal", "feedback", "issue", "avatar"]);

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  folder: z.string().optional(),
});

// Best-effort per-user usage tracking in Redis so the storage quota is
// enforced server-side. The counter self-heals: it expires after a short TTL
// and re-seeds from the real R2 listing on the next upload.
const USED_CACHE_TTL_SECONDS = 300;

async function getCurrentUsageBytes(userId: string): Promise<number> {
  const cached = await getCachedValue<number>(`media:used:${userId}`);
  if (typeof cached === "number") return cached;

  const prefix = `${env.IS_PROD ? "" : "dev-"}journal/${userId}/`;
  const objects = await listAllObjects(env.R2_BUCKET_NAME, prefix);
  const total = objects.reduce((acc, obj) => acc + obj.size, 0);
  await setCachedValue(`media:used:${userId}`, total, USED_CACHE_TTL_SECONDS);
  return total;
}

async function recordUsageBytes(userId: string, size: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.incrby(`media:used:${userId}`, size);
    await redis.expire(`media:used:${userId}`, USED_CACHE_TTL_SECONDS);
  } catch {
    // Usage tracking is best-effort; never block an upload on it.
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit presigns — each one authorizes a PUT into the bucket.
    const limit = await rateLimit(`upload:${session.user.id}`, {
      limit: 30,
      windowSeconds: 600,
    });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 },
      );
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return NextResponse.json({ error: "Locked" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload parameters" },
        { status: 400 },
      );
    }

    const { contentType, size, folder } = parsed.data;

    if (
      !ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Only JPEG, JPG, WEBP, PNG, and GIF are allowed.",
        },
        { status: 400 },
      );
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds limit (max 5MB)." },
        { status: 400 },
      );
    }

    if (folder && !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Unknown folder" }, { status: 400 });
    }

    // Enforce the plan's storage quota server-side (the client-side bar is
    // display only). Without this, a presign loop could store unbounded data.
    // The structured payload lets the client open the paywall dialog (Phase D)
    // instead of showing a generic error.
    try {
      const { mediaStorageBytes } = await EntitlementsService.getEntitlements(
        session.user.id,
      );
      const used = await getCurrentUsageBytes(session.user.id);
      if (used + size > mediaStorageBytes) {
        return NextResponse.json(
          {
            error: "Storage quota exceeded. Delete some files first.",
            code: "storage_quota_exceeded",
            limitBytes: mediaStorageBytes,
            usedBytes: used,
          },
          { status: 507 },
        );
      }
    } catch (e) {
      logger.warn(
        "Could not verify storage quota before upload",
        undefined,
        e as Error,
      );
    }
    void recordUsageBytes(session.user.id, size);

    const isProduction = env.IS_PROD;
    const envPrefix = isProduction ? "" : "dev-";

    let category = "journal";
    if (folder === "issue" || folder === "feedback") {
      category = "system";
    } else if (folder === "avatar") {
      category = "avatars";
    }

    const ext = EXT_BY_TYPE[contentType] ?? "bin";
    const subPath = folder ? `${folder}/` : "";
    const key = `${envPrefix}${category}/${session.user.id}/${subPath}${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });
    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ presignedUrl, publicUrl });
  } catch (error) {
    logger.error(
      "Failed to generate media upload presigned URL",
      error as Error,
    );
    return NextResponse.json(
      { error: "An unexpected error occurred during URL signing." },
      { status: 500 },
    );
  }
}
