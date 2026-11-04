# Monitoring & Alerting

Stack: **Sentry** (errors, traces, server logs) + **Better Stack** (external
uptime, heartbeats, status page) + **Vercel Speed Insights** (field Core Web
Vitals). All three run on free tiers until traffic outgrows them.

The guiding constraint: Withink is a private, encrypted diary. An error report
must never carry journal content, credentials, or keys.

---

## Code map

| Path | Purpose |
| --- | --- |
| `apps/app/src/instrumentation-client.ts` | Browser SDK init; route-change transactions. |
| `apps/app/src/instrumentation.ts` | Registers Node/Edge SDKs; captures request errors via `onRequestError`. |
| `apps/app/src/sentry.server.config.ts` | Server runtime init (sampling, scrubbing). |
| `apps/app/src/sentry.edge.config.ts` | Edge runtime init (proxy, edge handlers). |
| `apps/app/src/lib/monitoring/scrub-event.ts` | Shared PII/content scrubber (`beforeSend`, breadcrumbs). |
| `apps/app/src/lib/monitoring/report-client-error.ts` | Error-boundary reporter: Sentry when configured, otherwise `/api/monitoring/errors`. |
| `apps/app/next.config.ts` | `withSentryConfig`, `/monitoring` tunnel route, source-map upload. |
| `apps/app/src/app/api/health/route.ts` | Static liveness probe for Better Stack. |
| `apps/app/src/app/layout.tsx` | `<SpeedInsights />`. |

The pre-existing beacons (`/api/monitoring/errors`,
`/api/monitoring/web-vitals`) stay in place as the no-DSN fallback and as
first-party console logs.

---

## Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel (all envs) + local `.env.local` | Public DSN; safe in the browser bundle. |
| `SENTRY_DSN` | Vercel (optional) | Private server/edge DSN override. Falls back to the public DSN. |
| `SENTRY_ORG` | Vercel build env | Sentry org slug. |
| `SENTRY_PROJECT` | Vercel build env | Sentry project slug (`withink-app`). |
| `SENTRY_AUTH_TOKEN` | Vercel **build** env only | Source-map upload. Create with `project:releases` and `org:read` scopes. Never prefix with `NEXT_PUBLIC_`. |
| `SENTRY_ENVIRONMENT` | Vercel (optional) | Defaults to `VERCEL_ENV` (`production` / `preview` / `development`). |

Local dev works with all of them blank: the SDK disables itself and the
first-party beacon handles boundary errors.

---

## One-time setup checklist

### 1. Accounts

| Service | Plan | Cost | Used for |
| --- | --- | --- | --- |
| [sentry.io](https://sentry.io) | Developer (free) | $0 | Errors, traces, logs |
| [betterstack.com](https://betterstack.com) | Free (10 monitors) | $0 | External uptime, status page |
| Vercel | existing project | $0 | Speed Insights (enable in dashboard) |

The Better Stack free tier is advertised for personal projects. If you would
rather stay strictly commercial, either upgrade Better Stack (monitors are
~$25/mo) or use Sentry's included uptime monitor (1 free) until revenue.

### 2. Sentry

1. Sign up, pick a **data region** (US or EU — EU for GDPR), and create an
   organization (e.g. `withink`).
2. Create **Project → Next.js**, name `withink-app`. One project is enough —
   separate dev/preview/prod via environments, not projects.
3. Copy the DSN: **Settings → Projects → withink-app → Client Keys (DSN)**.
   It looks like `https://<key>@o123456.ingest.sentry.io/7654321`
   (EU: `o123456.ingest.de.sentry.io`).
4. Copy the org slug: **Settings → Organization Settings → General →
   Organization Slug**.
5. Copy the project slug from the project URL / project settings — usually
   `withink-app`.
6. Create the auth token. Preferred: **Organization Settings → Auth Tokens →
   Create New Token** — org tokens are pre-scoped for CI/source-map upload.
   If you instead use the personal token page (**Settings → Auth Tokens**),
   set **Release → Admin** (Write is usually enough), **Organization → Read**,
   and everything else **No Access**. Check the Permissions Preview lists
   `project:releases` and `org:read`. The token is shown once — copy it now;
   if a source-map upload later returns 403, add **Project → Read** and retry.
7. Optional but recommended: **Settings → Security & Privacy** → enable
   default data scrubbing as a second layer (the SDK scrubber runs first).
8. Set quota alerts: **Settings → Usage & Billing → Alerts** at 80% and 100%.
9. Recommended alerts: **Alerts → Create Alert** →
   "A new issue is created" (email) and "An issue is seen more than 10 times
   in 1 hour" (email).

### 3. Environment variables

Only set what the row says. `NEXT_PUBLIC_*` is public by design; the auth
token is a secret.

| Variable | Value | Local `apps/app/.env.local` | Vercel app project | Vercel dev project |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN from step 3 | optional (blank = off) | ✅ Production + Preview | ✅ Production |
| `SENTRY_ORG` | org slug | for local source maps only | ✅ Production + Preview | ✅ Production |
| `SENTRY_PROJECT` | `withink-app` | same as Vercel | ✅ Production + Preview | ✅ Production |
| `SENTRY_AUTH_TOKEN` | token from step 6 | usually omit | ✅ Production + Preview (**Sensitive**) | ✅ Production (**Sensitive**) |
| `SENTRY_ENVIRONMENT` | server/edge label | omit | `production` (or omit) | `dev` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | browser label | omit | `production` | `dev` |
| `SENTRY_DSN` | private DSN | optional | omit (public DSN is used) | omit |

Notes:

- **Redeploy after adding/changing env vars.** Vercel bakes them into the
  build; existing deployments keep the old values.
- Mark only `SENTRY_AUTH_TOKEN` as **Sensitive** in Vercel. The DSN ends up in
  the client bundle anyway, and public vars are fine to leave visible.
- The dev Vercel project reports `VERCEL_ENV=production` because `dev` is its
  production branch. Set both `SENTRY_ENVIRONMENT=dev` (server) and
  `NEXT_PUBLIC_SENTRY_ENVIRONMENT=dev` (browser) there, or dev errors will be
  tagged as production. Browser bundles only see `NEXT_PUBLIC_*` values.
- `SENTRY_AUTH_TOKEN` is only used at build time for source-map upload. If it
  is missing, the build still succeeds but stack traces stay minified.
- Turbo already lists all of these in `build.env` (`turbo.json`), so cached
  builds invalidate correctly.

### 4. Local smoke test (optional)

1. Put `NEXT_PUBLIC_SENTRY_DSN` in `apps/app/.env.local`.
2. `pnpm dev:app`, open the app, and watch DevTools → Network: the SDK posts
   envelopes to **`/monitoring`** (not directly to sentry.io).
3. Temporarily add `throw new Error("sentry-smoke-test")` to the `GET` handler
   in `apps/app/src/app/api/health/route.ts`, request
   `http://localhost:3000/api/health`, confirm the issue appears under
   **development**, then revert the throw.
4. With the DSN blank, the SDK disables itself and the first-party
   `/api/monitoring/errors` beacon remains the fallback.

### Privacy contract (why it is safe for a diary)

The scrubber in `src/lib/monitoring/scrub-event.ts`:

- deletes the entire request payload (`data`, `body`, `cookies`, headers) and
  the query string — server actions can carry plaintext;
- redacts sensitive keys recursively (`content*`, `title`, `payload`,
  `password`, `passcode`, `token`, `secret`, `masterKey`, `unlockProof`,
  `salt`, `email`, `username`, …) in `extra`, `contexts`, and `tags`;
- drops whole `entry` / `letters` objects;
- drops `console`, `ui.click`, `ui.input`, and `ui.render` breadcrumbs
  (they capture typed text);
- redacts emails, UUIDs, and 32/64-char hex strings; truncates text to 2,000
  chars;
- keeps only `user.id` (never email/name/IP); `sendDefaultPii: false`.

Session Replay is **not** installed. Do not add it for authenticated routes.

If a new event enriching integration is added, extend the scrubber first and
write a test for it.

---

## Better Stack setup

1. Sign up at [betterstack.com](https://betterstack.com).
2. **Uptime → Create monitor** once per row below. In each monitor:
   - **Check frequency**: 60s (or 300s for dev)
   - **Monitor locations**: pick at least two regions (e.g. US East, EU
     Frankfurt, Asia Pacific)
   - **Request method**: GET
   - **Expected status code**: 200
   - **Verification rule**: response body contains the keyword in the table
   - **Confirmation period**: 2 checks before alerting (avoids flapping)

   **Free-plan limits:** minimum check frequency is 3 minutes, and only
   “URL becomes unavailable” (status-code) alerting is included. Keyword
   matching, SSL/domain-expiry checks, and faster intervals require the paid
   plan — until then, monitor status 200 only.
3. **On-call → Notification channels**: add your email; optionally connect
   Slack and add a webhook. Attach it to every monitor.
4. **Status pages → Create status page**: name `withink`, choose public or
   private, then add all monitors. Add a custom domain later if wanted.
5. Enable TLS-expiry alerts in each monitor's settings (or add Better Stack's
   SSL monitor) so certificates do not lapse silently.

| Monitor | URL | Method | Expect | Interval |
| --- | --- | --- | --- | --- |
| App liveness | `https://app.withink.me/api/health` | GET | 200 + body contains `"status":"ok"` | 60s |
| App login | `https://app.withink.me/login` | GET | 200 + keyword `withink` | 60s |
| Marketing | `https://withink.me` | GET | 200 | 60s |
| Dev app | `https://dev.withink.me/api/health` | GET | 200 | 300s |

Notes:

- Monitor from at least two regions; the free tier includes 10 monitors.
- Better Stack watches TLS expiry automatically — add an alert 14 days out.
- `/api/health` is intentionally dependency-free. Do **not** make it query
  Mongo or Redis: a cache/database blip should be alerted from Atlas/Upstash,
  not reported as "the app is down".
- Heartbeats: no cron jobs exist today. If one is added (cleanup, webhook
  retry), create a Better Stack heartbeat and ping it on success.

### Platform-native alerts (free, enable once)

- **MongoDB Atlas**: connections, disk %, replication lag, slow queries.
- **Upstash**: command/bandwidth limits and error-rate alerts.
- **Cloudflare R2**: storage and operation alerts.
- **Dodo Payments**: webhook delivery failures and test-mode leakage.
- **Vercel**: deployment failure notifications (org settings → notifications).

---

## Vercel Speed Insights

1. Open the **app** Vercel project (not docs) → **Speed Insights** tab →
   **Enable**. You may need to redeploy once.
2. Data appears after the first production traffic; Hobby includes 10k events
   per 30 days. Add **Speed Insights Plus** only if you exceed that.
3. No env vars are needed — the `<SpeedInsights />` component is already in the
   root layout. The existing `WebVitals` component still posts a copy to our
   own endpoint for console-level logs; that is intentional.

## Production verification

After deploying with the env vars set:

1. **Sentry**: trigger one real error or watch for natural traffic. Check
   **Issues** shows the event, the environment is `production` (or `dev` on the
   dev project), and **Releases** lists the latest deployment with uploaded
   source maps. If maps are missing, check the Vercel build log for Sentry
   upload errors and confirm the token scopes and org/project slugs.
2. **Tunnel**: in DevTools → Network, an error produces a `POST /monitoring`
   with a 2xx response. If that is blocked, check that `proxy.ts` did not start
   protecting `/monitoring`.
3. **Better Stack**: all monitors turn green; force one failure (temporarily
   wrong path in a monitor) and confirm the alert email arrives.
4. **Speed Insights**: the Vercel tab shows LCP/INP/CLS after traffic.
5. **Privacy spot-check**: open a captured event and confirm `request.data` is
   absent, `user` contains only `id` (if any), and no content/title values are
   present in `extra` or breadcrumbs.

---

## Triage runbook

1. **Better Stack alarm** → check the status page and Vercel deployment state.
   If `app.withink.me/api/health` is down but the marketing site is up, suspect
   the app deployment or Vercel function health; redeploy/rollback if needed.
2. **Sentry alert** → open the issue, check `boundary`/route tags, release, and
   the first affected event. Confirm whether it is client or server (runtime
   tag).
3. **Data/DB symptoms** (slow queries, timeouts) → Atlas metrics first; Sentry
   traces sample 10% of requests and can show the slow span.
4. **Encryption/decryption errors** → they are reported without payloads; ask
   for the date/route only, never the journal content.
5. After resolving, add a regression note to `PROJECT_STATE.md` if the cause was
   non-obvious.

---

## Adding a new monitored surface

- Prefer automatic instrumentation (server actions, route handlers, RSC) over
  manual `captureException`.
- For React error boundaries, call `reportClientError(error, "<boundary>")`.
- Never call `Sentry.setUser` with email/name; `id` only.
- Never attach request bodies, journal entries, letter text, or master keys to
  `extra`/`contexts`.
