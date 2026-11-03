/**
 * TEMPORARY smoke-test route: verifies Sentry captures server errors.
 * Remove after verifying the issue appears in Sentry.
 */
export async function GET(): Promise<Response> {
  throw new Error("withink-server-sentry-test");
}
