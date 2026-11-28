// Server-only URL resolution. Reads env at request/build time so values are
// not frozen into any client bundle (NEXT_PUBLIC_* are inlined at build).

const isProd = process.env.IS_PROD === "true";

/** Canonical origin of the marketing site. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (isProd ? "https://withink.me" : "http://localhost:3001")
  );
}

/** Public URL of the dashboard app (register / login / diary). */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (isProd ? "https://app.withink.me" : "http://localhost:3000")
  );
}

/** Where "Open your diary" sends new visitors. */
export function registerUrl(): string {
  return `${appUrl()}/register`;
}
