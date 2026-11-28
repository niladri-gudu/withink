"use client";

/**
 * Renders the current year on the client.
 *
 * `new Date()` is disallowed in a Server Component during static prerender
 * under Cache Components, so the shared footer delegates the copyright year
 * here. The footer is static content; only this number is time-dependent.
 */
export function CurrentYear() {
  return <>{new Date().getFullYear()}</>;
}
