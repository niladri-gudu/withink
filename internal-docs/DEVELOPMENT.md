# Withink V2 — Development Guide

Technical documentation for developing, configuring, building, and deploying this monorepo.

> Product overview lives in the root `README.md`. Engineering rules and workflow live in `CLAUDE.md`; architecture decisions in `ARCHITECTURE.md`.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Monorepo Layout](#monorepo-layout)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Design System](#design-system)
- [Testing](#testing)
- [Billing & Entitlements (Engineering View)](#billing--entitlements-engineering-view)
- [Emails](#emails)
- [Deployment](#deployment)
- [Engineering Workflow](#engineering-workflow)

---

## Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Cache Components/PPR, React Compiler, typedRoutes) |
| UI            | React 19, TypeScript                                |
| Styling       | Tailwind CSS v4, shadcn/ui-style primitives         |
| Animation     | Motion                                              |
| Editor        | Tiptap v3                                           |
| Forms         | React Hook Form + Zod                               |
| Authentication| Better Auth (email/password + Google OAuth)         |
| Database      | MongoDB (Mongoose)                                  |
| Cache         | Upstash Redis (rate limiting, entitlements cache)   |
| Storage       | Cloudflare R2 (S3 API)                              |
| Email         | Resend                                              |
| Payments      | Dodo Payments (+ Standard Webhooks verification)    |
| Testing       | Vitest + Testing Library                            |
| Monorepo      | Turborepo + pnpm workspaces                         |

---

## Monorepo Layout

```
/
├── apps/
│   ├── app/              ← Dashboard app (deployed at app.withink.me)
│   │                        All auth, DB models/repositories, services, features.
│   └── docs/             ← Public landing & policy site (deployed at withink.me)
│                            Landing, pricing, about, privacy, terms, contact. Dev port 3001.
├── packages/             ← Shared workspace packages, consumed as source
│   │                        via transpilePackages (no build step):
│   ├── ui/               ←   @withink/ui — shadcn-style kit (per-component subpaths)
│   ├── tokens/           ←   @withink/tokens — canonical design-token theme.css
│   ├── theme/            ←   @withink/theme — next-themes provider + cross-tab sync
│   ├── utils/            ←   @withink/utils — cn() and other pure utilities
│   ├── config/           ←   @withink/config — site configuration
│   ├── eslint-config/    ←   @withink/eslint-config — shared flat config
│   └── typescript-config/←   @withink/typescript-config — shared tsconfig presets
├── internal-docs/        ← Engineering docs of record
└── turbo.json            ← Turborepo pipeline configuration
```

> **Note:** the data layer (Mongoose models, repositories, storage, email, auth)
> is intentionally **app-local** under `apps/app/src/`, not in `packages/`.

Inside `apps/app/src/`, code follows a **feature-first** layout:

```
apps/app/src/
├── app/                  ← Routing only (App Router pages, layouts, API routes)
├── components/           ← Cross-feature shared components (incl. email layout)
├── config/               ← zod-validated environment access
├── constants/            ← Routes, limits
├── features/
│   ├── auth/             ← Sign in/up, verification, reset, email templates
│   ├── journal/          ← Entries, editor, calendar, search, save pipeline
│   ├── media/            ← Uploads, gallery, lightbox, quotas
│   ├── insights/         ← Heatmap, stats, trends
│   ├── flashbacks/       ← Resurfacing past entries
│   ├── settings/         ← Profile, appearance, data, danger zone
│   ├── lock/             ← Diary PIN lock + email-code reset flow
│   ├── encryption/       ← Zero-knowledge setup/change flows
│   ├── billing/          ← Plans, entitlements, Dodo checkout/webhooks, session caps
│   ├── feedback/         ← In-app feedback + team notification
│   └── app-shell/        ← Shell, sidebar rail, bottom tab bar
├── hooks/  lib/  providers/  server/
```

Each feature owns its own `components/ actions/ hooks/ validation/ repositories/ services/ tests`.

---

## Prerequisites

| Tool  | Version                | Notes                                                                 |
| ----- | ---------------------- | --------------------------------------------------------------------- |
| Node  | `>=24.11.1 <25`        | Pinned by `.nvmrc` + `engines`. Do not casually bump — newer Node ships a c-ares regression that breaks `mongodb+srv://` DNS resolution (especially on Windows). |
| pnpm  | `10.27.0`              | Enabled via corepack: `corepack enable && corepack prepare pnpm@10.27.0 --activate` |

You will also need credentials for: MongoDB Atlas, Upstash Redis *(optional)*, Cloudflare R2, Resend, Google OAuth *(optional)*, and Dodo Payments *(optional)*.

---

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the dashboard app's environment
cp apps/app/.env.development.example apps/app/.env.local
#    …then fill in the values (see table below)

# 3. Run both apps in dev mode
pnpm dev
#    or run them individually:
pnpm dev:app          # dashboard  → http://localhost:3000
pnpm dev:docs         # marketing  → http://localhost:3001
```

> ⚠️ **Never set `IS_PROD=true` locally.** That flips the app onto the
> production database (`withink`) and production-scope cross-subdomain
> cookies. Local development must always use `IS_PROD=false`, which selects
> the `withink_dev` database and local-scope cookies.

Environment variables are validated **lazily** with zod in
`apps/app/src/config/env.ts` (`server-only`). Nothing throws until a variable
is first read at runtime — except `NEXT_PUBLIC_R2_PUBLIC_URL`, which is
required at **build** time.

Tests do not need real credentials: `vitest.setup.ts` mocks `@/config/env`,
so the suite runs with no network and no database.

---

## Environment Variables

All variables below belong to `apps/app` (copy from `.env.development.example`
for dev/staging or `.env.production.example` for production).

| Variable | Required | Description |
| --- | --- | --- |
| `IS_PROD` | ✅ | `"false"` locally/dev → `withink_dev` DB + local cookies. `"true"` only in the production deployment. |
| `MONGODB_URI` | ✅ | MongoDB cluster URI. DB name is derived from `IS_PROD`. |
| `BETTER_AUTH_SECRET` | ✅ | Better Auth secret (32+ chars). |
| `BETTER_AUTH_URL` | ✅ | Public base URL of the deployment (e.g. `http://localhost:3000`, `https://dev.withink.me`, `https://app.withink.me`). Used for auth callbacks and email links. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ➖ | Google OAuth. Redirect: `<BETTER_AUTH_URL>/api/auth/callback/google`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ➖ | Rate limiting + entitlements caching. Optional — calls fail open if unset. |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | ✅* | Cloudflare R2 credentials for media/export storage. |
| `R2_PUBLIC_URL` | ✅* | Internal public asset URL (e.g. `https://assets.withink.me`). |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | ✅ (build-time) | Public asset URL exposed to the browser. The build fails without it. |
| `RESEND_API_KEY` | ✅* | Transactional email sending. |
| `EMAIL_FROM` | ✅* | From header, e.g. `Withink <noreply@withink.me>`. |
| `CONTACT_EMAIL` | ✅* | Team inbox for feedback notifications. |
| `ENCRYPTION_KEY` | ✅* | 64 hex chars — AES-256-GCM server-side encryption (unlock tokens, legacy content). Distinct from user-held ZK keys. |
| `DODO_API_KEY` / `DODO_WEBHOOK_SECRET` | ➖ | Billing. Without them the app runs Free-tier and checkout surfaces show a clear "billing unavailable" message instead of crashing. |
| `DODO_PRODUCT_PLUS_MONTHLY` / `_PLUS_YEARLY` / `_PRO_MONTHLY` / `_PRO_YEARLY` | ➖ | Dodo product IDs mapped to plan entitlements. |

✅* = required for full functionality; the app degrades gracefully where marked optional.

---

## Scripts

Root-level scripts are Turborepo pipelines (run across all packages):

```bash
pnpm dev            # dev servers for both apps (docs on :3001)
pnpm dev:app        # dashboard only
pnpm dev:docs       # marketing site only
pnpm build          # production build (all packages)
pnpm lint           # eslint everywhere
pnpm typecheck      # tsc --noEmit everywhere
pnpm test           # vitest everywhere (builds dependencies first)
pnpm format         # prettier --write .   (*.md ignored)
pnpm format:check   # prettier --check .
```

Per-app:

```bash
pnpm --filter @withink/app <script>
pnpm --filter @withink/docs <script>
```

Notes:

- `pnpm test` runs through Turbo and **builds first** (`dependsOn: ["^build"]`).
  For a fast, focused check run vitest directly:

  ```bash
  pnpm --filter @withink/app exec vitest run src/features/journal/services/journal-service.test.ts
  pnpm --filter @withink/app exec vitest        # watch mode
  ```

- The app's production build goes through `apps/app/scripts/build.mjs`
  (sets V8 heap flags, caps workers). Don't replace it with a bare
  `next build`.

---

## Architecture

### Principles

- **Server-first**: React Server Components by default; Client Components only when interactivity demands it.
- **Server Actions over API routes** — REST endpoints exist only where the platform requires them (auth catch-all, webhooks, media upload, monitoring).
- **Feature-first ownership**: each feature owns its components, actions, hooks, validation, repositories, services, and tests.
- **Repository pattern**: features never touch Mongoose directly. Repositories own persistence; services own workflows; validation (zod) always runs before business logic.
- **Authorization on every action**: ownership and entitlement checks happen server-side on every mutation and read — never trust the client.
- **State hierarchy**: Server State → URL State → Component State → Context → Global State (in that order of preference).

### Data flow example (saving an entry)

```
Editor (client, Tiptap + IndexedDB offline queue)
  → saveEntryAction (server action)
      → zod schema validation
      → session check (Better Auth)
      → EntitlementsService.getEntitlements (Redis-cached plan resolution)
      → JournalService.saveJournalEntry (workflow rules: backfill window, edit grandfathering)
          → JournalRepository (Mongoose persistence)
```

### Offline & sync

The editor writes through an IndexedDB-backed cache with an outbox queue.
Writes succeed offline ("Saved locally · Will sync"); on reconnect a single-flight
sync pulls server changes, prunes safely (compare-and-delete semantics prevent
data loss), and drains the queue. A service worker provides static asset
caching — production-only registration, auto-unregistered in dev.

---

## Security Model

- **Authentication** — Better Auth with email verification (required in production), password reset, and Google OAuth. Sessions are capped per plan; the oldest device is signed out gracefully when the cap is exceeded (courtesy email sent).
- **Zero-knowledge encryption (opt-in)** — entry content can be encrypted entirely client-side. The master key is derived via PBKDF2 inside a Web Worker, held only in memory, unlocked per-session with a "Diary Password". The server stores ciphertext only. A strict unlock-proof binding (HKDF + SHA-256 hash, one-time email-code migration for legacy accounts) prevents cookie forgery.
- **Transport hardening** — AES-256-GCM everywhere (`iv:authTag:ciphertext` strictly enforced via `decryptToken()`), timing-safe comparisons, single-use email codes, standardwebhooks HMAC verification on the Dodo webhook (raw-body read, verified pre-parse).
- **Input discipline** — zod validation with bounded sizes on every action; unbounded inputs (search terms, insight dates, error reports) are clamped before use.
- **Rate limiting** — per-user Redis limiters on sensitive endpoints (search, insights, exports, deletions, email sends, error reporting); fail-open on Redis outage so the app never hard-fails.
- **Deletion hygiene** — account deletion purges journal content, R2 media (`journal/`, `avatars/`, `system/{userId}/`), and feedback records; media reads are prefix-checked against the requester's own namespace to close cross-tenant access.
- **Secrets** — server-only env access via a zod-validated module; nothing sensitive reaches the client bundle.

---

## Design System

Withink looks like stationery: **cream paper background, brown-ink text, warm amber accents**, serif display type with hand-written margin notes (Caveat), and a "Field Ledger / Annotated Codex" visual language.

- Tokens are defined once in `packages/tokens/theme.css` (oklch values, light + dark themes) and consumed as semantic Tailwind v4 utilities (`bg-background`, `text-foreground`, `text-running-head`, `text-hand`, fluid `text-display/hero/h1…`).
- **Never hardcode colors, spacing, typography, or animations.** Use tokens.
- Components come from `@withink/ui` (per-component subpath imports, e.g. `@withink/ui/button`), styled shadcn-style with cva.
- Motion (not Framer Motion, not GSAP) for all animation — fast, subtle, purposeful, and fully gated behind `prefers-reduced-motion`.
- Mobile-first throughout: bottom tab bar + sheets on phones, folio rail on desktop, 44px minimum touch targets, `env(safe-area-inset-*)` respected, documented z-index contract.

See `DESIGN_SYSTEM.md` before building any UI.

---

## Testing

- **Framework**: Vitest + Testing Library (jsdom), configured per-app.
- **No real environment**: `vitest.setup.ts` mocks `@/config/env`, so tests run hermetically — no MongoDB, no Redis, no R2, no network.
- **What's covered**: service workflows (save rules, entitlements resolution, webhook event mapping, session caps), server actions (validation + authorization), upload route quota behavior, pure helpers (dates, backfill windows), and utility functions.

```bash
pnpm typecheck
pnpm lint
pnpm --filter @withink/app exec vitest run     # full suite, no rebuild
pnpm build
```

---

## Billing & Entitlements (Engineering View)

Powered by Dodo Payments: hosted checkout, self-serve customer portal, and HMAC-verified webhooks that upsert a per-user `billingaccounts` document and invalidate the Redis entitlements cache (`billing:{userId}:plan`, 60s TTL).

Entitlements resolve server-side with **fail-to-Free** semantics (a cache/database hiccup can never block writing):

| Gate | Free | Plus | Pro |
| --- | --- | --- | --- |
| Backfill window (new entries beyond N days old) | 14 days | 90 days | Unlimited |
| Media storage quota | 100 MB | 10 GB | 50 GB |
| Concurrent sessions | 1 | 3 | Unlimited |

Rules encoded in the services:

- Editing an existing day is always allowed regardless of age (grandfathering).
- Expired-but-empty days open the backfill paywall; future days stay locked.
- Hitting the storage quota returns `507 storage_quota_exceeded`, which the editor converts into the paywall dialog (no silent base64 fallback).
- Session cap enforcement deletes OLDEST sessions FIFO after each new sign-in (never the one just created) and is best-effort — billing can never block authentication.
- Failed renewals enter `past_due` grace keeping paid access; `canceled` drops to Free.
- Without billing env vars configured, the entire workspace runs Free tier; checkout/portal/webhook routes degrade with clear errors.

Canonical tier source: `internal-docs/MONETIZATION_PLAN.md` §2 and `features/billing/config/plans.ts`.

---

## Emails

All transactional email is sent through Resend and rendered from shared React templates:

| Email | Trigger |
| --- | --- |
| Confirm your email | Sign-up (verification required in production) |
| Your diary is ready | After signup (pre-verified) or email verification completes |
| Reset your password | Password reset request |
| Passcode reset code | Diary Lock PIN reset (6-digit code, 15-min expiry) |
| New device signed in | Oldest device soft-kicked by the session cap |

Templates live next to their features (e.g. `features/auth/components/emails/`) and share one paper-light shell in `src/components/email/email-layout.tsx` — brand colors mirrored from the design tokens as email-safe hex, serif wordmark, plain-text fallback on every send.

---

## Deployment

Deployed on **Vercel** as separate projects from this monorepo:

| Branch | Project | Domain |
| --- | --- | --- |
| `main` | app | **app.withink.me** |
| `main` | docs | **withink.me** |
| `dev` | app (preview project) | **dev.withink.me** |

- The `dev` Vercel project uses the `dev` branch as its Production Branch and mirrors local env values **except** `BETTER_AUTH_URL=https://dev.withink.me` (email links/OAuth redirects must resolve publicly).
- `NEXT_PUBLIC_R2_PUBLIC_URL` must be present at build time in every environment.
- Set `IS_PROD=true` only in the production projects — it selects the production database and `.withink.me`-scoped cookies.

---

## Engineering Workflow

1. Read `PROJECT_STATE.md` first — it's the living memory of the project (current phase, recent decisions, blockers).
2. Then consult, in order: `IMPLEMENTATION_PLAN.md` → `ARCHITECTURE.md` → `DESIGN_SYSTEM.md` → `PRD.md`.
3. Implement following the architecture and design rules above.
4. Verify: `pnpm typecheck` → `pnpm lint` → focused `vitest` → `pnpm build`.
5. Update `PROJECT_STATE.md` after meaningful milestones.

Non-negotiables: no hardcoded design values, no duplicated logic, accessibility is a requirement (keyboard, focus management, ARIA, reduced motion), and security review on anything touching auth, crypto, or file access.
