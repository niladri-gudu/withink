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
