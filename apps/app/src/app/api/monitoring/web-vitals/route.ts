import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/request-cache";
import { logger } from "@/server/logger";

const webVitalsSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession();
    const userId = session?.user?.id || "anonymous";

    const body = await req.json();
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
