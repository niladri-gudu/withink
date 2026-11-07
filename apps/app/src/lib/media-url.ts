import "server-only";

import { env } from "@/config/env";

const PROXY_MARKER = "/api/media/";

/**
 * Stable, origin-relative URL for a private media object.
 *
 * Journal images and avatars are private: they are served through
 * `/api/media/<key>` (session + lock + ownership checked) instead of the
 * public R2 domain. Feedback attachments stay on the public bucket because
 * they are viewed by the product owner outside the submitter's session.
 */
export function mediaProxyPath(key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${PROXY_MARKER}${encoded}`;
}

export function isSystemKey(key: string): boolean {
  const envPrefix = env.IS_PROD ? "" : "dev-";
  return key.startsWith(`${envPrefix}system/`);
}

/** Canonical URL for a stored object key. */
export function mediaUrlForKey(key: string): string {
  return isSystemKey(key) ? `${env.R2_PUBLIC_URL}/${key}` : mediaProxyPath(key);
}

/**
 * Recovers an R2 object key from either a proxy URL (`/api/media/...`) or a
 * legacy public URL. Returns null for anything that is not first-party.
 */
export function keyFromMediaUrl(url: string): string | null {
  const clean = url.split(/[?#]/)[0] ?? "";

  const proxyIndex = clean.indexOf(PROXY_MARKER);
  if (proxyIndex !== -1) {
    const encoded = clean.slice(proxyIndex + PROXY_MARKER.length);
    try {
      return encoded
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");
    } catch {
      return null;
    }
  }

  const publicBase = `${env.R2_PUBLIC_URL}/`;
  if (clean.startsWith(publicBase)) {
    try {
      return decodeURIComponent(clean.slice(publicBase.length));
    } catch {
      return null;
    }
  }

  return null;
}
