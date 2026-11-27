import { ApiError } from '@withink/api-client';

import { API_URL } from './config';

/** Absolute URL for a stored proxy path (`/api/media/<key>`). */
export function absoluteMediaUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
}

/** The server returns 507 (or the code) when the storage quota is full. */
export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 507 ||
      error.code?.toUpperCase() === 'STORAGE_QUOTA_EXCEEDED')
  );
}

const IMAGE_TAG = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** True for a URL served by the authenticated media proxy. */
export function isPrivateMediaSource(src: string): boolean {
  return /\/api\/media\//.test(src);
}

function collectFromJson(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectFromJson(item, found);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const node = value as { type?: unknown; attrs?: { src?: unknown } };
  if (
    node.type === 'image' &&
    typeof node.attrs?.src === 'string' &&
    isPrivateMediaSource(node.attrs.src)
  ) {
    found.add(node.attrs.src);
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    collectFromJson(child, found);
  }
}

/**
 * Every private media URL an entry references, in either stored spelling.
 * The editor WebView cannot authenticate `<img>` requests, so the host
 * resolves these to local previews before handing them over.
 */
export function collectMediaSources(
  html: string | null | undefined,
  json: unknown,
): string[] {
  const found = new Set<string>();
  if (html) {
    for (const match of html.matchAll(IMAGE_TAG)) {
      const src = match[1]?.trim();
      if (src && isPrivateMediaSource(src)) found.add(src);
    }
  }
  collectFromJson(json, found);
  return [...found];
}
