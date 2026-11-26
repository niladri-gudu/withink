import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { API_URL, APP_SCHEME } from "./config";

/**
 * Better Auth client. The Expo plugin stores the session in SecureStore and
 * handles the deep-link callback; `getCookie()` returns the cookie header we
 * can reuse for bearer-style API calls.
 */
const client = createAuthClient({
  baseURL: API_URL,
  plugins: [
    // The Expo plugin ships against a slightly different BetterFetch generic
    // than this Better Auth build; the runtime contract is the documented one.
    expoClient({
      scheme: APP_SCHEME,
      storage: SecureStore,
    }) as never,
  ],
});

/** Plugin actions (`getCookie`) are added at runtime by expoClient. */
export const authClient = client as typeof client & {
  getCookie: () => string;
};

/**
 * The session token the server's bearer plugin accepts.
 *
 * `getCookie()` returns the stored cookie header. Better Auth names the
 * session cookie `better-auth.session_token` (or `__Secure-...` in prod).
 */
export function getSessionToken(): string | null {
  try {
    const cookie = authClient.getCookie();
    if (!cookie) return null;
    const match = cookie.match(
      /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/,
    );
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
