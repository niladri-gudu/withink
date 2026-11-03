/**
 * TEMPORARY smoke-test route: verifies Sentry captures server errors.
 * Remove after verifying the issue appears in Sentry.
 */

// Without this, Next executes the handler at build time to prerender it and
// the throw fails the whole build instead of waiting for a runtime request.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  throw new Error("withink-server-sentry-test");
}
