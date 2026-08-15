import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({});

export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
  updateUser,
  requestPasswordReset,
  resetPassword,
} = authClient;

/**
 * Best-effort removal of the Better Auth session cookies from the browser.
 *
 * HttpOnly cookies can only truly be cleared by the server's Set-Cookie, so
 * this is belt-and-suspenders on top of `signOut()`. It covers the non-HttpOnly
 * (dev) case and any stale-cookie edge where the middleware might otherwise see
 * a cookie that no longer has a valid server session — which used to cause a
 * /login ↔ / redirect loop.
 */
export function clearSessionCookies(): void {
  if (typeof document === "undefined") return;

  const names = [
    "better-auth.session_token",
    "better-auth.session_data",
    "__Secure-better-auth.session_token",
    "__Secure-better-auth.session_data",
  ];

  for (const name of names) {
    document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}
