// Type-only: erased at build time, so it adds nothing to the bundle.
import type * as SentryType from "@sentry/nextjs";

import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
} from "./lib/monitoring/scrub-event";

// A DSN is public by design; it only routes events to the project. When it is
// absent (local dev, previews without secrets) the SDK stays disabled and the
// existing /api/monitoring/errors fallback keeps working.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// The browser SDK is large (~200 KB). A static import put it in the root
// bundle every route downloads and parses before hydration, even when no DSN
// is configured. Load it on idle instead — off the critical path — and not at
// all when Sentry is disabled.
let sentry: typeof SentryType | null = null;

function initSentry(): void {
  void import("@sentry/nextjs").then((Sentry) => {
    sentry = Sentry;
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
      // v11 replaced `sendDefaultPii` with granular collection controls.
      // Withink must not collect identities, cookies, headers, bodies, or
      // query params.
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
  });
}

if (typeof window !== "undefined" && dsn) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => initSentry(), { timeout: 4000 });
  } else {
    setTimeout(() => initSentry(), 3000);
  }
}

// Keeps navigation transactions named after the App Router route once the SDK
// has loaded. No-op for the initial transition (the SDK isn't ready yet).
export function onRouterTransitionStart(
  ...args: Parameters<typeof SentryType.captureRouterTransitionStart>
): void {
  sentry?.captureRouterTransitionStart(...args);
}
