import * as Sentry from "@sentry/nextjs";

import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
} from "./lib/monitoring/scrub-event";

// A DSN is public by design; it only routes events to the project. When it is
// absent (local dev, previews without secrets) the SDK stays disabled and the
// existing /api/monitoring/errors fallback keeps working.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  // Browser code only sees NEXT_PUBLIC_* at build time; NODE_ENV is always
  // "production" in an optimized build, even on the dev deployment.
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  // 10% of transactions is plenty for a single-tenant-ish diary at this
  // stage; errors themselves are always captured.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  // v11 replaced `sendDefaultPii` with granular collection controls. Withink
  // must not collect identities, cookies, headers, bodies, or query params.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
  },
  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "Non-Error promise rejection captured",
  ],
  denyUrls: [
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /extensions\//i,
  ],
  beforeSend: (event) => scrubSentryEvent(event),
  beforeSendTransaction: (event) => scrubSentryEvent(event),
  beforeBreadcrumb: (breadcrumb) => scrubSentryBreadcrumb(breadcrumb),
});

// Keeps navigation transactions named after the App Router route.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
