// NODE_ENV (not a custom flag) because Next.js statically inlines it into
// client bundles — IS_PROD is undefined in the browser, which baked localhost
// public-site links (e.g. "Return Home" on /verified) into production JS.
const isProd = process.env.NODE_ENV === "production";
const PUBLIC_SITE_URL = isProd ? "https://withink.me" : "http://localhost:3001";

export const ROUTES = {
  PUBLIC: {
    HOME: PUBLIC_SITE_URL,
    TERMS: `${PUBLIC_SITE_URL}/terms`,
    PRIVACY: `${PUBLIC_SITE_URL}/privacy`,
  },
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    VERIFY_EMAIL: "/verify-email",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
    VERIFIED: "/verified",
  },
  APP: {
    DASHBOARD: "/",
    ENTRIES: "/entries",
    ENTRY: (date: string) => `/entries/${date}`,
    NOTEBOOKS: "/notebooks",
    FLASHBACKS: "/flashbacks",
    INSIGHTS: "/insights",
    MEDIA: "/media",
    SETTINGS: "/settings",
    FEEDBACK: "/feedback",
  },
} as const;

export type Routes = typeof ROUTES;

/**
 * The journal editor route (`/entries/[date]`) is a TRUE fullscreen writing
 * surface: the shell renders no masthead, no tab bar, and no content padding
 * around it (see app-shell.tsx). Single source of truth so the shell and the
 * tab bar can never drift.
 */
export const EDITOR_ROUTE_PATTERN = /^\/entries\/[^/]+$/;
