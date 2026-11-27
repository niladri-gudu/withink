import { NextResponse } from "next/server";

import { logger } from "@/server/logger";
import { getMediaLibraryAndStats } from "@/features/media/services/media-service";

import { requireApiSession } from "../_lib";

/**
 * Native media library: the same listing + quota the web Server Action
 * returns, over the shared bearer/unlock gate.
 */
export async function GET() {
  const auth = await requireApiSession("media:list");
  if (auth.response) return auth.response;

  try {
    const data = await getMediaLibraryAndStats(auth.userId);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Media library listing failed", error as Error);
    return NextResponse.json(
      { error: "Could not load the media library." },
      { status: 500 },
    );
  }
}
