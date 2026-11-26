import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/request-cache";
import { getClientIp } from "@/lib/request-ip";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";

// Anonymous endpoint: bound every field so it can't be abused as an
// unbounded log-writing primitive, and throttle per IP.
const MAX_BODY_BYTES = 64 * 1024;

const errorReportingSchema = z.object({
  message: z.string().min(1).max(2_000),
  stack: z.string().max(8_000).optional(),
  digest: z.string().max(128).optional(),
  url: z.string().url().max(2_048).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession();
    const userId = session?.user?.id || "anonymous";

    const reqHeaders = await headers();
    const clientIp = getClientIp(reqHeaders);

    const limit = await rateLimit(`client-errors:${clientIp}`, {
      limit: 20,
      windowSeconds: 300,
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
        { error: "Invalid error payload parameters" },
        { status: 400 },
      );
    }
    const parsed = errorReportingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid error payload parameters" },
        { status: 400 },
      );
    }

    const { message: rawMessage, stack: rawStack, digest, url } = parsed.data;
    const userAgent = reqHeaders.get("user-agent") || "unknown";

    // Scrub client-reported message and stack trace to prevent plaintext log injection
    const message = scrubContent(rawMessage);
    const stack = rawStack ? scrubContent(rawStack) : undefined;

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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

function scrubContent(text: string): string {
  if (!text) return text;
  return (
    text
      // Redact quoted strings (single quotes, double quotes, backticks)
      .replace(/(["'`])(?:\\.|[^\\])*?\1/g, "$1[REDACTED]$1")
      // Redact email addresses
      .replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[REDACTED_EMAIL]",
      )
      // Redact potential session keys/UUIDs
      .replace(
        /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        "[REDACTED_UUID]",
      )
      // Redact potential hex keys (like 32-byte master key which is 64 hex characters)
      .replace(/\b[0-9a-fA-F]{64}\b/g, "[REDACTED_HEX_64]")
      .replace(/\b[0-9a-fA-F]{32}\b/g, "[REDACTED_HEX_32]")
  );
}
