export const ROUTES = {
  PUBLIC: {
    HOME: "/",
    TERMS: "/terms",
    PRIVACY: "/privacy",
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
    DASHBOARD: "/dashboard",
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
