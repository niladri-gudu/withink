import type { BetterAuthPlugin } from "better-auth";

/**
 * Minimal server half of Better Auth's Expo integration.
 *
 * Native fetch cannot set `Origin`, so the Expo client sends `expo-origin`
 * instead. Better Auth's CSRF check rejects cookie-bearing POSTs with a
 * missing origin (sign-out is the first one that hits it). The upstream
 * `@better-auth/expo` server plugin does exactly this propagation, but it
 * installs React Native peer dependencies into the Next app; we only need
 * this one behavior, so it lives here.
 *
 * `withink://` is already in `trustedOrigins`; an attacker-supplied
 * `expo-origin` is still validated against that list.
 */
export function expoOriginPlugin(): BetterAuthPlugin {
  return {
    id: "withink-expo-origin",
    init: () => ({
      options: {
        trustedOrigins: ["withink://"],
      },
    }),
    onRequest: async (request) => {
      if (request.headers.get("origin")) return;
      const expoOrigin = request.headers.get("expo-origin");
      if (!expoOrigin) return;

      // Clone rather than reconstruct: NextRequest carries private state, so
      // `new Request(request, …)` throws. Cloning keeps the body intact.
      const forwarded = request.clone();
      forwarded.headers.set("origin", expoOrigin);
      return { request: forwarded };
    },
  };
}
