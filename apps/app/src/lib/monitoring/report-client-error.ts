"use client";

import * as Sentry from "@sentry/nextjs";

/**
 * Reports a React error-boundary catch. Uses Sentry when configured; otherwise
 * falls back to the first-party beacon so errors still reach the server log
 * (and stay visible in Vercel logs) on deployments without a DSN.
 */
export function reportClientError(
  error: Error & { digest?: string },
  boundary: string,
): void {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { tags: { boundary } });
    return;
  }

  const payload = {
    message: error.message || "Unknown error",
    stack: error.stack,
    digest: error.digest,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  fetch("/api/monitoring/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error("Failed to send error log:", err);
  });
}
