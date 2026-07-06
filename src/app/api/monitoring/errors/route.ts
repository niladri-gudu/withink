import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/server/logger";

const errorReportingSchema = z.object({
  message: z.string().min(1),
  stack: z.string().optional(),
  digest: z.string().optional(),
  url: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id || "anonymous";

    const body = await req.json();
    const parsed = errorReportingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid error payload parameters" }, { status: 400 });
    }

    const { message, stack, digest, url } = parsed.data;
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || "unknown";

    // Formulate a structured error report
    const clientError = new Error(message);
    if (stack) {
      clientError.stack = stack;
    }

    logger.error(`[Client Error] ${message}`, clientError, {
      userId,
      digest,
      url,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail-silent on monitoring errors so we never crash/affect client UX
    logger.error("Failed to process client error report", error as Error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
