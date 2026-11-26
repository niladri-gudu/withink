import { createApiClient } from "@withink/api-client";
import { UNLOCK_HEADER_NAME } from "@withink/contracts";

import { getSessionToken } from "./auth-client";
import { API_URL } from "./config";
import { getUnlockToken } from "./session-state";

/**
 * Shared sync client. Cookie transport does not exist on native, so every
 * request carries the bearer session token and the server's sync gate skips
 * the web unlock cookie for bearer callers.
 */
export function createDiaryClient() {
  return createApiClient({
    baseUrl: API_URL,
    credentials: "omit",
    getHeaders: () => {
      const token = getSessionToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const unlock = getUnlockToken();
      if (unlock) headers[UNLOCK_HEADER_NAME] = unlock;
      return headers;
    },
  });
}
