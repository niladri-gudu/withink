import { connection } from "next/server";

/**
 * TEMPORARY smoke-test route: verifies Sentry captures server errors.
 * Remove after verifying the issue appears in Sentry.
 *
 * `connection()` opts this handler into request-time rendering. Route segment
 * config (`export const dynamic`) is rejected when cacheComponents is enabled.
 */
export async function GET(): Promise<Response> {
  await connection();
  throw new Error("withink-server-sentry-test");
}
