import "server-only";

/**
 * Best-effort client IP for anonymous rate limiting.
 *
 * Prefer the platform-set `x-real-ip`; fall back to the first
 * `x-forwarded-for` hop (the origin client when a trusted edge appends it).
 * This is a throttling input, never an authorization decision.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || "unknown";
}
