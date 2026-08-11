const isProd = process.env.IS_PROD === "true";
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
    FLASHBACKS: "/flashbacks",
    INSIGHTS: "/insights",
    MEDIA: "/media",
    SETTINGS: "/settings",
    FEEDBACK: "/feedback",
  },
} as const;

export type Routes = typeof ROUTES;
