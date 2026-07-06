import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { r2 } from "@/lib/r2";
import { env } from "@/config/env";
import { logger } from "@/server/logger";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/png",
  "image/gif",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  folder: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    const { filename, contentType, size, folder } = parsed.data;

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Only JPEG, JPG, WEBP, PNG, and GIF are allowed." },
        { status: 400 },
      );
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds limit (max 5MB)." },
        { status: 400 },
      );
    }

    const isProduction = env.IS_PROD;
    const envPrefix = isProduction ? "" : "dev-";

    let category = "journal";
    if (folder === "issue" || folder === "feedback") {
      category = "system";
    } else if (folder === "avatar") {
      category = "avatars";
    }

    const ext = filename.split(".").pop() || "bin";
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
    logger.error("Failed to generate media upload presigned URL", error as Error);
    return NextResponse.json(
      { error: "An unexpected error occurred during URL signing." },
      { status: 500 },
    );
  }
}
