import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/request-cache";
import { getClientIp } from "@/lib/request-ip";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";

// Anonymous endpoint: bound every field so it can't be abused as an
// unbounded log-writing primitive.
const MAX_BODY_BYTES = 8 * 1024;

const webVitalsSchema = z.object({
  id: z.string().max(128),
  name: z.enum([
    "LCP",
    "INP",
    "CLS",
    "FCP",
    "TTFB",
    "Next.js-hydration",
    "Next.js-route-change-to-render",
    "Next.js-render",
  ]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number().finite(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession();
    const userId = session?.user?.id || "anonymous";

    // Anonymous endpoint — throttle so it can't flood the log pipeline.
    const clientIp = getClientIp(await headers());
    const limit = await rateLimit(`web-vitals:${clientIp}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many reports" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await readJsonBody(req, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: "Invalid Web Vitals payload" },
        { status: 400 },
      );
    }
    const parsed = webVitalsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Web Vitals payload" },
        { status: 400 },
      );
    }

    const { id, name, value, rating, delta } = parsed.data;

    const logMeta = {
      userId,
      metricId: id,
      metricName: name,
      value,
      rating,
      delta,
    };

    const message = `[Web Vitals] ${name}: ${value} (${rating})`;

    if (rating === "good") {
      logger.info(message, logMeta);
    } else {
      logger.warn(message, logMeta);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to process Web Vitals report", error as Error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
