import { NextResponse } from "next/server";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

import { env } from "@/config/env";
import { r2 } from "@/lib/r2";
import { getRequestSession } from "@/lib/request-cache";
import { apiError } from "@/server/api-error";
import { logger } from "@/server/logger";
import { LockService } from "@/features/lock/services/lock-service";

import { requireApiSession } from "../../_lib";

// Reads cookies via the session/unlock checks, so this handler is dynamic.
type RouteContext = { params: Promise<{ key: string[] }> };

/**
 * Authenticated delivery for private media (journal images + avatars).
 *
 * Previously these objects were fetched straight from the public R2 domain,
 * so anyone holding a URL kept permanent access. Now the only stable URL is
 * this route: it requires a session, an unlocked diary, and an object key
 * under the caller's own namespace.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { key: segments } = await context.params;
    const key = segments.join("/");

    // Keys are always `<env-prefix><category>/<userId>/...`. Reject traversal
    // and anything outside the three user namespaces before touching R2.
    if (!key || key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await getRequestSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Unauthorized");
    }

    const envPrefix = env.IS_PROD ? "" : "dev-";
    const userId = session.user.id;
    const owned =
      key.startsWith(`${envPrefix}journal/${userId}/`) ||
      key.startsWith(`${envPrefix}avatars/${userId}/`) ||
      key.startsWith(`${envPrefix}system/${userId}/`);
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const unlocked = await LockService.isRequestUnlocked(userId, true);
    if (!unlocked) {
      return apiError("LOCKED", "Locked");
    }

    const object = await r2.send(
      new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
    if (!object.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = object.Body as unknown as {
      transformToWebStream?: () => ReadableStream;
    };
    const stream =
      typeof body.transformToWebStream === "function"
        ? body.transformToWebStream()
        : (object.Body as unknown as ReadableStream);

    return new Response(stream, {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        ...(object.ContentLength
          ? { "Content-Length": String(object.ContentLength) }
          : {}),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NoSuchKey" || name === "NotFound") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error("Media proxy failed", error as Error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/**
 * Deletes one object the caller owns. Zero-knowledge clients must scrub entry
 * references BEFORE calling this (the server cannot read encrypted content);
 * the ownership prefix check is the only authorization here either way.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiSession("media:delete", 60);
  if (auth.response) return auth.response;

  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!key || key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const envPrefix = env.IS_PROD ? "" : "dev-";
  const userId = auth.userId;
  const owned =
    key.startsWith(`${envPrefix}journal/${userId}/`) ||
    key.startsWith(`${envPrefix}avatars/${userId}/`) ||
    key.startsWith(`${envPrefix}system/${userId}/`);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await r2.send(
      new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Media deletion failed", error as Error);
    return NextResponse.json(
      { error: "The file could not be deleted." },
      { status: 500 },
    );
  }
}
