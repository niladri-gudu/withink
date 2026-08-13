# Withink V2

# Project State

Last Updated: 2026-08-10

Current Phase: Production Hardening

Current Milestone: Release Ready (Security & Housekeeping Remediation)

Project Status: 🟢 Rebuild Complete and Release Ready

---

# Purpose

This document serves as the living memory of the project.

Unlike the PRD, Design System, or Architecture documents, this file changes throughout development.

Every AI assistant working on this repository should read this file before making any changes.

After completing a meaningful milestone, this file should be updated.

The objective is to eliminate repeated explanations between development sessions and maintain a consistent understanding of the project's current state.

---

# Project Overview

Withink is a premium digital journaling application focused on calmness, privacy, and long-term reflection.

The project is a complete rebuild of Version 1.

Version 1 exists only as a reference.

Version 2 is being built from scratch with a new architecture, improved user experience, stronger security, better performance, and significantly higher code quality.

---

# Repository Structure

```
/
│
├── apps/app/              ← Version 2 Dashboard App Layer (Deployed at app.withink.me)
│
├── apps/docs/             ← Public Landing & Policy Pages (Deployed at withink.me)
│
├── packages/              ← Shared workspace packages (@withink/ui, @withink/tokens, ...)
│
└── internal-docs/         ← Markdown engineering docs (Architecture, PRD, design system, logs)
```

---

# Source of Truth

Always follow documentation in this order:

1. PRD.md

2. DESIGN_SYSTEM.md

3. ARCHITECTURE.md

4. IMPLEMENTATION_PLAN.md

5. PROJECT_STATE.md

6. old (Reference Only)

If the existing project conflicts with documentation,

documentation wins.

---

# Tech Stack

Framework

- Next.js 16
- React 19
- TypeScript

Styling

- Tailwind CSS v4
- shadcn/ui

Animation

- Motion

Authentication

- Better Auth

Database

- MongoDB
- Mongoose

Caching

- Upstash Redis

Storage

- Cloudflare R2

Validation

- Zod

Editor

- Tiptap

Email

- Resend

Icons

- Lucide React

---

# Core Engineering Decisions

The following decisions should not be changed unless absolutely necessary.

## Architecture

Feature-first architecture.

Server Components by default.

Client Components only when required.

Server Actions preferred.

Minimal API Routes.

Business logic separated from infrastructure.

Repositories own persistence.

Services own workflows.

Validation exists before business logic.

---

## State Management

Prefer:

Server State

↓

URL State

↓

Component State

↓

Context

↓

Global State

Avoid introducing unnecessary global state libraries.

---

## Styling

Tailwind CSS only.

Use semantic design tokens.

Never hardcode colors.

Follow DESIGN_SYSTEM.md.

---

## Animation

Use Motion.

Never use Framer Motion.

Animations should be subtle.

Fast.

Purposeful.

---

## Forms

React Hook Form

+

Zod

for all forms.

---

## Data Fetching

Prefer Server Components.

Prefer Server Actions.

Use client fetching only for interactive experiences.

---

## Security

Encrypt journal content.

Validate every request.

Authorize every protected resource.

Never trust client input.

---

# Current Progress

## Completed Documentation

- PRD.md

- DESIGN_SYSTEM.md

- ARCHITECTURE.md

- IMPLEMENTATION_PLAN.md

---

## Phase 1

Foundation

Status:

🟩 Complete

---

## Phase Checklist

Phase 1

Foundation

🟩

Phase 2

Authentication

🟩

Phase 3

Application Shell

🟩

Phase 4

Design System Integration

🟩

Phase 5

Journal Editor

🟩

Phase 6

Journal Entries

🟩

Phase 7

Media

🟩

Phase 8

Search

🟩

Phase 9

Flashbacks

🟩

Phase 10

Insights

🟩

Phase 11

Settings

🟩

Phase 12

Export

🟩

Phase 13

Feedback

🟩

Phase 14

Performance

🟩

Phase 15

Accessibility

🟩

Phase 16

Testing

🟩

Phase 17

Production Readiness

🟩

Phase 18

Final Polish

🟩

---

# Current Goals

- Release Ready: Rebuild successfully completed, visual consistency checked, and test suite green. Ready for final release deployment.

---

# Current Blockers

None.

Note: MongoDB (`mongodb+srv://`) now connects. The earlier `querySrv ECONNREFUSED` was caused by a c-ares 1.34.6 regression in Node ≥ v24.13.0 (Windows DNS discovery returns no servers → falls back to `127.0.0.1`), not by WARP or app code — resolved by downgrading Node to v24.11.1 (c-ares 1.34.5).

---

# Recent Decisions

2026-08-13

- Shipped the Annotated Codex surface redesign for `apps/app` (theming intact):
  - New shell: chrome becomes marginalia. A narrow left margin rail (wordmark + Caveat date + folio-numeral index 01 Today → 07 Feedback in tracked uppercase + colophon with ThemeToggle and user) is ruled from the text block by a 1px hairline, replacing the old sidebar-panel + breadcrumb-bar + card-grid app shell. Desktop breadcrumb bar removed; a slim mobile-only header (menu + wordmark + theme) replaces it, with the full folio rail sliding in as a drawer.
  - Page headers: every surface now opens with a printed running head (folio name in tracked caps, hand-set date) ruled above the serif title + gold italic accent. New `PageHeader` `runningHead`/`description` API; loading skeletons mirror it.
  - Surfaces as pages: dashboard is "today's page" (2px gold gradient hairline on the reflection sheet; streak becomes a flat "Margin note" with hand caption); insights' four icon-tile stat cards became one hairline-separated at-a-glance passage; entries calendar metrics flattened to a folio row.
  - Primitives: `@withink/ui/card` now rests flat (no `shadow-sm` at rest; interactive cards still lift); labels normalized to the 0.2em running-head / 0.16em label voices.
  - Direction: surface-structure roll (seed `be2a53bd`, candidate 4 — The Annotated Codex) inside the pinned Field Ledger world; contract comment written into `apps/app/src/app/layout.tsx` and verified to survive the production build.
  - Verification: `tsc --noEmit` clean, eslint clean on all touched files, Impeccable detector clean, production build succeeds (21 routes), desktop + mobile visual pass on dashboard/entries/insights/settings/media/flashbacks/editor.
  - Branch: `redesign/field-ledger-app` (polish commit `a48c0af`; redesign work uncommitted at write time).

2026-08-10

- Migrated the repository to a proper Turborepo monorepo:
  - Restructure: moved the two previously-independent apps into `apps/app` (`@withink/app`) and `apps/docs` (`@withink/docs`); created a single root `pnpm-workspace.yaml` (with pnpm version catalog + `onlyBuiltDependencies` allowlist), root lockfile, root `turbo.json` (build/dev/lint/typecheck/test/format tasks with env-aware build caching), `.nvmrc` (Node 24.11.1 pin for the c-ares fix), consolidated root `.gitignore`, and a shared root Prettier config (pinned to 3.4.2 to match existing formatting).
  - Shared packages: extracted the actual cross-app duplication into `packages/` — `@withink/ui` (Button, Card, Input, Textarea, Skeleton, Tooltip, BrandLoader, ThemeToggle), `@withink/theme` (ThemeProvider + cross-tab cookie sync), `@withink/tokens` (canonical design-token CSS layer), `@withink/utils` (`cn`), `@withink/config` (`siteConfig`), plus `@withink/typescript-config` and `@withink/eslint-config`. Packages ship as source and are consumed via `transpilePackages` + `@source` Tailwind directives; shadcn `components.json` now targets the packages.
  - Deliberately kept the data layer (Mongoose models, repositories, R2, Resend, Better Auth) app-local; `packages/*` glob leaves room for `@withink/database`, `@withink/email`, etc. in a future phase.
  - Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`): install → lint → test → build → typecheck → format:check.
  - Verification: root `pnpm lint` (0 errors), `pnpm typecheck` clean across all packages/apps, full Vitest suite 100/100 passing, production builds succeed for `@withink/app` (21 routes + proxy) and `@withink/docs` (7 routes), `pnpm format:check` clean.

2026-08-02

- Resolved MongoDB `querySrv ECONNREFUSED` (machine-level, NOT code): Root cause proven to be a c-ares 1.34.6 regression in Node ≥ v24.13.0 that fails to read Windows DNS servers (GetAdaptersAddresses) and hard-falls back to `127.0.0.1`, breaking all `dns.resolveSrv()` / `mongodb+srv://` connections. Verified via raw `GetAdaptersAddresses` probe (WARP's `127.0.2.2/127.0.2.3` were present and correct) and upstream issues (nodejs#62748, c-ares#1140). Fixed by downgrading Node v24.18.0 → v24.11.1 (bundles c-ares 1.34.5). Confirmed: `dns.getServers()` → `["127.0.0.2","127.0.0.3"]`, SRV resolves, MongoDB connects, app typecheck/lint/tests (99/99) and dev server all green. Do NOT upgrade Node past v24.12 until Node ships a c-ares 1.34.6 DNS fix.

- Completed Production-Grade Security & Housekeeping Remediation (Tiers 0–6):
  - Autosave & Offline Reliability: Rewrote `use-auto-save` with single-flight saves, retry, offline queue, and convergence dedupe; added 8 unit tests; offline edits re-sync on unlock. Service worker (`sw.js`) now handles offline navigation with a branded `offline.html`.
  - Zero-Knowledge Server: Removed all server-side decryption of user entry content; encryption keys live only in the browser. Server retains `safeDecrypt`/`decrypt` solely for the lock session token and legacy plaintext migration. Media list/lightbox scrub user content client-side.
  - Diary Lock Hardening: Single SSR lock gate in `(app)/layout.tsx` (`DiaryLockGate`) covers all nested pages; `getAllEntriesAction` and `/api/media/upload` return locked errors/403 when locked. Passcode verification uses `timingSafeEqual`; reset codes use `crypto.randomInt`; reset-email requests rate-limited (3/15 min); hex validation added to crypto client and worker.
  - CSP Hardening (both apps): `script-src 'unsafe-eval'` dev-only, added `script-src-attr 'none'` and `object-src 'none'`.
  - App Shell & UX Fixes: Fixed `app-shell` ref-during-render (state-adjust-during-render pattern), `save-indicator` setState-in-effect, `media-lightbox` stale-cache-on-open, `journal-editor-shell` cross-date stale content, and removed `as any` casts in theme/audio files. Lint now 0 errors / 1 warning (intentional EB Garamond font link).
  - Dependency Hygiene: Removed bogus `save-dev` (0.0.1-security) placeholder from `app/` and `docs/` package.json; declared `server-only` (used by 14+ server files) as an explicit dependency; pruned ~20 unused app-only dependencies from `docs/package.json` (docs site now installs only its ~10 real packages).
  - Verification: Typecheck clean, lint clean (docs) / 0 errors + 1 font warning (app), full Vitest suite 99/99 passing, production builds succeed for both `app` (21 routes) and `docs` (7 routes).

2026-07-11

- Restructured Repository for Subdomain Routing Topology:
  - Repository scope split: Separated application code into `app/` (serving `app.withink.me` dashboard) and `docs/` (serving `withink.me` public marketing/legal pages).
  - Directory rename: Renamed internal engineering markdown docs from `docs/` to `internal-docs/`. Deleted old `old/` directory.
  - Subdomain routing: Shifted `/dashboard` to `/` in the dashboard app, removed public route templates from the app project, and updated all hardcoded references/links.
  - Wildcard cookies: Integrated `.withink.me` wildcard domain cookies in Better Auth config for production subdomain session sharing.
  - Public Contact Us page: Created a brand new, serene Contact Us page with form support and email utilities under `/contact` in the public site.
  - Verification: Clean TypeScript compilation and successful production builds completed for both projects, with the full Vitest suite (91/91 tests) passing cleanly.

2026-07-10

- Shipped Diary Lock (Diary Passcode Lock):
  - Secondary Security Layer: Designed and implemented a local passcode (PIN) lock that intercepts client-side UI and server-side actions, protecting entries, media, flashbacks, insights, and ZIP downloads even if login credentials are known.
  - Tactile Keypad Overlay: Built a fullscreen backdrop-blurred PIN keypad overlay with tactile animations, automatic submission, keyboard listeners, error shaking, and multi-path lock recoveries (login credentials check and Resend email codes).
  - Onboarding Flow: Added a passcode setup onboarding dialog prompting users on login to secure their diary if they haven't set up a passcode.
  - Configuration Settings: Integrated a Diary Lock section card in Settings to allow toggling locks, changing PINs, customizing auto-lock timeouts, and setting tab-switching locks.
  - Test Suite Expansion: Expanded the Vitest suite with 12 new unit tests covering lock settings, cookie verification, recovers, and setting validations. All 91 unit tests are passing cleanly.

2026-07-06

- Completed Phase 18 Final Polish:
  - Typography Polish: Replaced heavy `font-black` headings with design-system standard `font-bold` (700) for display/hero headings and `font-semibold` (600) for card titles, improving readability and editorial warmth.
  - Theme Toggle Relocation: Placed the `ThemeToggle` component in the main top header for all viewports, ensuring theme switching is always accessible even when the sidebar is collapsed on desktop. Removed redundant toggle elements from the sidebar.
  - Landing Page Copy: Replaced "Begin Rebuilding" CTA with "Get Started". Updated the tactile mockup preview card with warm, poetic journal entry descriptions of tea/rain/nature and a "Calm 😌" mood tag to align with emotional diary goals.
  - Legal Pages Styling: Aligned Terms of Service and Privacy Philosophy pages to use standard design-system typography classes (`text-h1`, `text-title`, `text-body-small`).
  - Baseline Test Fixes: Resolved a failing unit test in `entry-actions.test.ts` where MongoDB `_id` was being asserted instead of client-mapped decrypted entry `id`.

2026-07-06

- Completed Phase 17 Production Readiness:
  - SEO & Metadata: Configured comprehensive titles and metadata on 14 pages (Home, Login, Register, Forgot Password, Reset Password, Verified, Dashboard, Entries, Entry Detail, Flashbacks, Insights, Media, Feedback, Settings) and added `/entries/` route block to crawler disallow lists in `robots.ts`.
  - Security Headers: Configured `next.config.ts` to return Content-Security-Policy (CSP) allowing `'self'`, Google OAuth avatars, and R2 bucket assets, Strict-Transport-Security (HSTS) with subdomains and preload support, and X-XSS-Protection.
  - Logging Consolidation: Replaced raw `console.error` with our redaction-safe structured `logger` inside database, cache, auth, and actions adapter boundaries.
  - Client-Server Error Gateways: Created `/api/monitoring/errors` to intercept client-side exceptions and report them to the server log.
  - Web Vitals Tracking: Created `<WebVitals />` tracking component and `/api/monitoring/web-vitals` to log core web performance ratings.

2026-07-06

- Email Verification & Welcome Email Hook:
  - Welcome Email trigger: Added the `afterEmailVerification` callback within Better Auth's config in [auth.ts](file:///d:/code/saas/temp/withink.me/src/lib/auth.ts). When a user registers using email and password, their verification status is initially pending (`emailVerified = false`). Once they click the verification link in their email, this hook fires to dispatch the Welcome Email (mirroring the immediate Welcome Email sent to Google OAuth users).

2026-07-06

- Completed Phase 16 Testing:
  - Custom React Hooks: Created comprehensive unit tests for `useFocusTrap` (verifying auto-focus, focus wrapping within bounds on Tab/Shift+Tab, and restoring focus to parent trigger elements upon deactivation/unmount) and `useDebounce` (asserting value delay intervals and timer clears).
  - Server Actions: Added extensive unit/integration tests for server-side endpoints:
    - Auth Action: Tested database client connection and user lookup checks (`checkIdentityExists`) with lowercased normalization.
    - Insights Action: Verified session protection and retrieval of analytics payload from the service layer.
    - Journal Entry Actions: Covered entries retrieve, CRUD operations, date firewall checks, and streak calculation edge cases.
    - Media Actions: Tested storage stats computation, secure bucket listing, ownership checks, and deep scrubbing of deleted media URLs within MongoDB HTML and Tiptap JSON structures.
  - Verification: Completed test suite execution successfully, with 79/79 tests across 14 test files passing cleanly, and verified build stability.

2026-07-06

- Feedback and Journal Autosave Reliability Fixes:
  - Feedback Page Width: Aligned the feedback page width from `max-w-3xl` to `max-w-5xl` in [page.tsx](file:///d:/code/saas/temp/withink.me/src/app/(app)/feedback/page.tsx), standardizing layout dimensions across all diary dashboard routes.
  - Journal Autosave Bug: Resolved the "Save failed" issue in red. First, implemented client-side date-synchronization via `withink-local-date` cookie in [app-shell.tsx](file:///d:/code/saas/temp/withink.me/src/features/app-shell/components/app-shell.tsx) to keep Server Components and Server Actions aligned on the user's actual browser local date. Second, modified the `useAutoSave` hook in [use-auto-save.ts](file:///d:/code/saas/temp/withink.me/src/features/journal/hooks/use-auto-save.ts) to reset baseline states synchronously when the date changes, preventing dirty state race conditions and incorrect expired/future grace period evaluations.
  - Editor Toolbar TypeError: Fixed a transient runtime `TypeError` (`Cannot read properties of null (reading 'can')`) in [editor-toolbar.tsx](file:///d:/code/saas/temp/withink.me/src/features/journal/components/editor/editor-toolbar.tsx) by adding a defensive guard clause checking for editor presence inside the `useEditorState` selector before reading capabilities.

2026-07-06

- Completed Phase 15 Accessibility.
- Focus Management: Created a reusable `useFocusTrap` hook to wrap focus inside modal dialogs and sliding panels (Media Lightbox, Delete Account Modal, and Mobile Sidebar drawer), and added `Escape` key close handlers to them. Added a visually hidden-until-focused "Skip to content" link at the top of the App Layout page targeting the main body.
- ARIA semantics and labels: Added `role="dialog" aria-modal="true"` to lightbox, mobile sidebar, and settings delete account modal. Associated error message elements to inputs via `aria-describedby` in all auth and feedback forms. Added descriptive `aria-label`s to show/hide password buttons, the journal editor title/back actions, entries search/filters/pagination inputs, and month calendar buttons/day cells.
- Visual Focus Indicators: Added focus-visible outline indicators (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) to custom buttons and cards in settings (theme selects, avatar upload) and feedback form categories, ensuring keyboard navigability is visually traceable.
- Layout Alignment: Standardized the Feedback page width constraint from `max-w-3xl` to `max-w-5xl` in `feedback/page.tsx`, bringing visual symmetry with all other diary dashboard pages.
- Verification: TypeScript typecheck clean, ESLint linting clean (zero errors/warnings), Vitest unit test suite (43/43 tests passing), and production next build (22 routes with PPR stream support) successfully completed.

2026-07-06

- Completed Phase 14 Performance.
- Build stability: the production `next build` was crashing during "Collecting page data" with a V8 `Fatal process out of memory: Zone` on this Windows machine (exit `0xC0000409`), even with `serverMinification: false`. Root cause was the page-data worker pool (Next.js defaulted to 15 workers) exhausting the default ~1.5 GB heap. Verified the fix by capping concurrency to 4 and lifting the heap to 4 GB. Rather than baking POSIX-style `NODE_OPTIONS=...` env prefixes into the `build` npm script (which only parses under POSIX shells and breaks under `cmd.exe`), added a portable zero-dependency Node build driver `scripts/build.mjs` that sets `NODE_OPTIONS`/`NEXT_WORKER_CONCURRENCY` before spawning `next build --webpack` with inherited stdio — works identically across shells. The `build` script now runs `node scripts/build.mjs`.
- Dynamic imports / bundle splitting (the phase's deliverable): converted the three heaviest client graphs to `next/dynamic` so first paint is no longer blocked by their chunks. (1) The entries editor (`/entries/[date]`) now lazy-loads `JournalEditorShell` (`ssr: true`) with an `EditorSkeleton` fallback that mirrors the route's `loading.tsx`; the grace-period firewall branch (future/expired dates, which never render the editor) no longer pulls the Tiptap chunk into the route's client bundle. (2) The Insights dashboard lazy-loads a new `InsightsCharts` wrapper (`ssr: true`) bundling the heatmap, mood/word charts, activity summaries, and monthly overview — the header and four stat cards above the fold render immediately, the SVG-heavy charts stream in after, with a matching `InsightsChartsSkeleton` placeholder. (3) The media gallery's full-screen lightbox is extracted into `MediaLightbox` and lazy-loaded (`ssr: false`), so it only enters the bundle when a thumbnail is actually opened; deleted lightbox internals from the gallery by passing `files`/`index`/`onClose`/`onPrev`/`onNext`/`onDeleted` props. No behavior changes — pure code-splitting.
- Image optimization: audited all four raw `<img>` tags in the repo. Converted the two that represent content UI — the feedback screenshot preview (`feedback-form.tsx`) and the settings avatar (`settings-shell.tsx`, fixed 80 px circular, `fill`/`sizes="80px"`) — to `next/image`. Intentionally left the other two as raw `<img>`: the feedback email template (`next/image` does not render in email HTML) and the Google favicon companion icon (a tiny external icon that needs a new `remotePatterns` host and gains nothing from optimization). Both converted hosts (`R2_PUBLIC_HOST`, `lh3.googleusercontent.com`) were already in `next.config.ts` `remotePatterns`.
- Redis optimization: collapsed the fixed-window rate limiter (`src/server/rate-limit.ts`) from three sequential Redis round-trips (`incr` → conditional `expire` → `ttl`) to a single pipelined round-trip via `redis.pipeline().incr().expire().ttl().exec<[number,number,number]>()` (verified against installed `@upstash/redis@1.38.0`). Always sets `expire` — not only on `count === 1` — which also fixes a latent race where a worker crash between `incr` and `expire` left a counter that never expired. The fail-open contract is preserved exactly (Redis null or `exec` rejection → allowed). Updated `rate-limit.test.ts` to assert one pipeline `exec`, added a TTL-fallback case; suite is now 43 tests.
- Query optimization: added a compound index `{ userId: 1, date: -1 }` to the `Entry` schema alongside the existing `{ userId: 1, date: 1 } unique` index. The hot sorted-read paths (`getEntriesPage`, `getEntryDates`, and any `sort({ date: -1 })` listing) now hit the index instead of an in-memory sort. Kept the asc index for ascending reads (insights full scan, export). Deliberately did **not** add a `{ userId, mood }` index — mood-filtered search decrypts in-app in `JournalService.getInsights`, so DB-side mood selectivity doesn't pay off (architecture: "Only optimize proven bottlenecks").
- Cache review: the version-based invalidation (`entries:{userId}:version` incremented on save/delete, with `:v{version}:` keyed entries/pages/stats/dates) and the hot/archive TTL split are correct and degrade gracefully when Redis is absent — no changes. Noted one maintainability nit (see Technical Debt): `CACHE_KEYS` constants are declared but the repository uses ad-hoc string keys; left untouched because consolidating key builders risks churning working invalidation for no perf gain.
- Core Web Vitals / rerender review: React Compiler is on (`reactCompiler: true`) and handles memoization; spot-checked `MediaGallery` (inline filter/sort acceptable at this dataset size, React Compiler memoizes downstream; the real win was the lightbox split), `InsightsDashboard` (the single client-side timezone re-fetch via `getInsightsAction` is correct and runs once), and confirmed no `Date.now()`/`Math.random()` in component render paths. No rerender bugs found — "reviewed, no action."
- Verification: TypeScript clean, ESLint clean (zero warnings), all 43 unit tests pass. Production build (`pnpm build` → `node scripts/build.mjs`) completes clean: 22 routes generated, all diary routes (`/dashboard`, `/entries`, `/entries/[date]`, `/feedback`, `/flashbacks`, `/insights`, `/media`, `/settings`) registered as Partial Prerender (`◐`), page-data collection finished in 6.4s with no OOM.

2026-07-05

- Completed Phase 13 Feedback (user ↔ team communication channel).
- Created a new `features/feedback/` module: a shared Zod `feedbackSchema` (shared client/server), a Mongoose `FeedbackModel` (userId, email, category, subject, message, imageUrl?, status, timestamps), `FeedbackRepository.create()` for persistence only, and `FeedbackService.submit()` for persist + best-effort team email notification.
- Preserved V1's two categories ("issue" / "feedback") as `bug` and `general`, and added `idea` as a natural home for feature requests. The client form renders a calm segmented category picker (Bug / Idea / General) using the design-system aesthetic.
- Team email is sent via the existing Resend client to `CONTACT_EMAIL`, rendered as an inline-styled `FeedbackNotification` JSX template matching the `verify-email` pattern. Email is strictly best-effort: persistence succeeds regardless — send failures are caught and logged and never block the user, consistent with `auth.ts`.
- Reused the existing `/api/media/upload` presigned route for screenshots with `folder: "feedback"` (already maps to the secure `system/{userId}/feedback/` path) — no new upload route, no new library.
- Secured the submission with `submitFeedbackAction`: Better Auth session required, server-side Zod re-validation (never trusts the client), and a first-party ownership check on `imageUrl` — when present it must start with `${R2_PUBLIC_URL}/` and contain the caller's own `system/{userId}/feedback/` prefix (no arbitrary/SSRF URLs in the record or email).
- Added a reusable fixed-window rate limiter in `src/server/rate-limit.ts` keyed on `feedback:{userId}` (5 / hour), backed by the existing Redis client with `INCR` + `EXPIRE`. It degrades gracefully — if Redis is absent or errors, the request is allowed through and the failure is logged — so legitimate users are never blocked by our own infrastructure. Reusable for auth/uploads later without a new dependency (chose this over `@upstash/ratelimit` per the "avoid new libraries" rule).
- Added a reusable design-system `Textarea` primitive in `src/components/ui/textarea.tsx` mirroring `Input` styling, and a `FEEDBACK` block in `constants/limits.ts` (subject/message min-max, rate-limit window/max).
- Converted `/feedback` to a server component with the standard auth redirect (like `/settings`), kept the sibling-consistent page header, and renders `<FeedbackForm />` in a calm centered column. The form supports inline validation, screenshot upload with thumbnail preview + remove, toasts on error, and a success confirmation card ("Thank you" + "Send another" / "Back to Today"). Used `useWatch` over `watch()` to stay React-Compiler-clean.
- Added `feedback-service.test.ts` (persist + best-effort email, email-failure tolerance) and `rate-limit.test.ts`. TypeScript, ESLint (zero warnings), all 42 unit tests, and the production build are clean; `/feedback` registers as a Partial Prerender route.

2026-07-04

- Completed Phase 12 Export (data ownership).
- Created a new `features/export/` module. Added `ExportService.generateExportZip(userId)` which builds a complete ZIP backup with `jszip`: a `README.txt`, a clean `metadata.json` (date, title, mood, wordCount, timestamps — no encrypted blobs or rendered HTML), plain-text `entries/{year}/{Month}/{date}.txt`, formatted `entries/{year}/{Month}/{date}.html`, and an `images/` folder.
- Improved on the V1 export: images are retrieved securely from R2 by deriving the object key from `R2_PUBLIC_URL` and calling `GetObjectCommand` (first-party assets only — no arbitrary URL fetching / SSRF), images are deduped, and a single unreadable image never fails the whole export.
- Delivered the download via a streaming route handler `GET /api/export` (auth-guarded, 401 when unauthenticated, `Content-Disposition` attachment with a dated filename). Binary downloads belong in a route handler, not a Server Action.
- Added data-access helpers reused from the journal feature: `EntryRepository.getAllEntries` (uncached, complete, chronological) and `JournalService.getAllEntriesForExport` (decrypts via the existing private `decryptEntry`, keeping decryption centralized).
- Surfaced the entry point as a self-contained "Your data" section (`DataExportCard`) inside the redesigned Settings page, matching the diary section-card styling; the design-system sidebar lists no Export item and the old app also placed export under Settings.
- Added 5 unit tests (32 total passing) covering archive structure, clean metadata, first-party-only image capture, dedupe, the empty-journal case, and graceful handling of an unreadable image. TypeScript, ESLint, and the production build are all clean; `/api/export` is registered.

2026-07-03

- Replaced the single generic root `loading.tsx` (a centered writing-card skeleton shown for every route) with per-route `loading.tsx` skeletons that mirror each page's real layout, so the loading state now represents the page instead of one uniform placeholder.
- Added faithful skeletons for Dashboard (2+1 top grid, 2-col bottom grid), Entries (calendar grid + timeline list), Entry editor (title, mood/metadata bar, writing lines), Insights (4 stat cards, heatmap, chart cards), Flashbacks (letter card), Media (storage bar, controls, image grid), and Settings (single column of section cards). Feedback is static and needs none; the root `loading.tsx` remains a fallback for auth/public routes.
- Extracted `PageLoadingShell` and `PageLoadingHeader` helpers into `features/app-shell/components/page-loading.tsx` so skeletons reuse the exact container width and render each page's real eyebrow + serif headline immediately, skeletoning only the data-dependent regions.
- Also fixed the Settings shell to fill the standard `max-w-5xl` page width (it was constrained to `max-w-2xl`, making it look narrower than sibling pages).
- Verified: TypeScript, ESLint, all 27 unit tests, and the production build are clean.

2026-07-03

- Redesigned the Phase 11 Settings interface. The first build had inadvertently reproduced Version 1's cramped visual language (7–10px mono uppercase micro-labels, `font-black tracking-tighter` headings, dense two-column "binder spread"), so the page looked identical to the old app and violated the Design System's calls for warmth, calm, and generous spacing.
- Rebuilt `SettingsShell` as a single, calm centered column of paper-like section cards (Profile, Appearance, Paper Feel, Security, Connected Accounts, Sign out, Delete account). Adopted the semantic type scale (`text-h3`, `text-title`, `text-body-small`, `text-caption`) and design tokens instead of hardcoded hex colors and pixel font sizes.
- Each section now leads with an icon + serif title + quiet description, with comfortable spacing between controls. Theme selection uses larger Sand/Moon cards with sun/moon glyphs; Paper Feel keeps the scale slider, auto-detect, PPI calculator, and credit-card calibration but with roomier, gentler styling; Connected Accounts uses a clean list with Connected/Not connected badges; the delete confirmation modal was softened to match the diary aesthetic.
- Preserved all existing behavior and server logic unchanged: `deleteAccountAction`, avatar upload flow, `changePassword`, paper-scale persistence, and the type-to-confirm "DELETE" deletion. All 27 unit tests still pass; TypeScript, ESLint, and the production build are clean.

2026-07-02

- Completed Phase 11 Settings.
- Designed and built a destructive server action `deleteAccountAction` to securely delete user profiles, purge all encrypted journal entries from MongoDB, drop R2 storage contents (journal attachments and avatar uploads), invalidate Redis cache entries, and delete Better Auth records (user, session, account).
- Developed the client-side `SettingsShell` with dedicated tabs for Profile (name/email and direct R2 avatar upload), Appearance (Sand Light and Moon Dark cards), Paper Feel (visual scale slider, auto-detect device dimensions, diagonal screen PPI calculator, and interactive credit card drag calibration supporting mouse/touch events), Security (Zod-validated change password forms), and Connected Accounts.
- Secured the settings page route at `/settings` with server-side authentication redirect checks.
- Wrote extensive unit tests verifying account deletion workflows, cache invalidation, and R2 delete commands.
- Verified that the workspace complies with TS/ESLint rules and successfully compiled the production build.

2026-07-02

- Completed Phase 10 Insights.
- Designed and built a dedicated `InsightsService` that retrieves unencrypted metadata (date, wordCount, mood, createdAt) for entries on the database level, computing streaks and analytics without decryption overhead.
- Implemented robust streak calculations returning the current daily writing streak and longest writing streak.
- Created a 365-day calendar heatmap rendering entry details, shaded by word count volume, utilizing Radix UI tooltips, and padded with spacers to align week days correctly.
- Created mood distribution summaries and charted average mood trends over the past 6 months using responsive SVG line graphs.
- Modeled monthly average word count volumes using responsive SVG bar charts.
- Categorized weekly and diurnal activity patterns (active days of the week, writing times by timezone-offset adjusted hours).
- Drafted a selector-based monthly overview card filtering entries, words, and mood distributions.
- Mounted the dashboard at `/insights` route, checked all TypeScript types, ESLint rules, and successfully finalized production builds.

2026-07-02

- Completed Phase 9 Flashbacks.
- Designed and implemented a dedicated `FlashbackService` and server actions that retrieve today's flashback.
- Implemented prioritization of anniversary memories (e.g. exactly 1 year ago today, or past years) with automatic fallbacks to random historical entries older than yesterday.
- Added Redis caching (24-hour TTL) of the day's chosen flashback to ensure perfect consistency across the dashboard and flashbacks pages.
- Built a robust history-tracking mechanism in Redis to store the last 10 unique shown flashback dates, avoiding repetitive flashbacks.
- Created a refresh action to force-select a new flashback and update the cache seamlessly.
- Crafted a premium client UI using the Diary design system, with concentric circular outline backgrounds, detailed mood tone styling, and action triggers for responding or re-reading.
- Developed comprehensive unit tests verifying anniversary priorities, random exclusions, cache checks, and refresh operations, ensuring clean TypeScript compiler and ESLint audits.

2026-07-02

- Completed Phase 8 Search.
- Re-architected search to decrypt and query journal entry contents on the server-side to bypass database-level query limitations on encrypted AES-256-GCM payloads.
- Implemented robust case-insensitive matching across entry titles, full-text bodies, and localized date variations (ISO dates, short-month, and long-month formats).
- Built a front-end `<Highlight>` text renderer in the timeline that splits matched strings and renders highlights cleanly inside titles and snippet excerpts.
- Designed a smart text excerpt/snippet extractor `getSnippet` that centers matches from the body content.
- Created extensive unit tests verifying exact keyword, date format, and paginated search behavior.
- Cleaned all type checks, ESLint rules, and Next.js production builds with zero warnings or errors.

2026-07-01

- Completed Phase 7 Media Integration.
- Integrated Cloudflare R2 bucket connectivity with presigned URLs API endpoint at `/api/media/upload` supporting authorized uploads capped at 5MB (jpeg, webp, png, gif).
- Developed server actions inside `media-actions.ts` for listing, deleting, fetching storage stats, and checking which journal entry owns a media asset.
- Implemented deep-scrubbing of user entries upon media deletion, scanning encrypted journal entries (HTML and Tiptap JSON content nodes) to remove matching image references, re-encrypting, and invalidating user entry cache.
- Built a premium memory gallery page `/media` featuring a modern storage bar dashboard, responsive grid/list views, sort/search controls, and an interactive lightbox preview.
- Completed all type checks, lint checks, and Next.js production builds with zero warnings or errors.

2026-07-01

- Implemented the complete Journal Entries timeline index view supporting real-time debounced title search, mood and time-range filters, and standard pagination.
- Designed a beautiful, responsive monthly calendar component matching the dark/light diary theme, highlighting written dates and supporting visual navigation.
- Created Server Actions for entries pagination, consistency statistics, calendar highlights, and secure entry deletion.
- Integrated consistency metrics (total reflections count, current daily streak, average words) dynamically updating when journal logs are deleted.
- Connected the V2 app dashboard to live data loaders replacing static placeholders, including recent reflections list and dynamic flashbacks (prioritizing 1-year anniversaries).
- Resolved Next.js typed routes compiler constraints by using type-safe Link href and router push parameter castings.
- Resolved React 19 compiler impurities by isolating math-random logic to regular service-layer helpers outside React components.
- Verified zero TypeScript compilation warnings and zero ESLint rule violations across all new features.


- Built out the V2 Journal Editor feature module (Phase 5) utilizing Server Actions, Mongoose persistence schemas, and debounced autosaving with Upstash Redis cache version invalidation.
- Implemented the Tiptap rich-text editor components with a visual viewport keyboard-avoidance listener and support for file drop/paste base64 encoding fallbacks.
- Developed custom mood selector and save indicator components styled according to the premium dark/light Design System.
- Incorporated a date validation and grace-period creation firewall protecting entries routing.

- Integrated a semantic typography type scale (.text-display, .text-hero, .text-h1, etc.) into the CSS and Tailwind environment as utility directives.
- Polished the theme switching experience with smooth, synchronous 200ms background/color transitions on all interface containers and layout tags.
- Built refined, standardized UI components (Inputs, Buttons, and Cards with support for interactive hover-scaling variants).
- Updated Landing and App-Shell routes (Dashboard, Entries, Feedback, Flashbacks, Insights, Media, Settings) to fully respect the spacing guidelines and the new typography system.
- Replaced inline sidebar stub on dashboard with a dynamic, unified `AppShell` feature module containing a collapsible Sidebar (with custom React popover user profile menu) and a dynamic breadcrumbs Header.
- Restructured route group layouts to fetch the user session on the server side and pass the user details to client-side layout primitives.
- Cleansed ESLint linter errors and TypeScript compiler warnings for all layout, dashboard, and header components.
- Confirmed Next.js 16 / React 19 / Tailwind CSS v4 stack.
- Deployed cached MongoClient, Mongoose, Upstash Redis, S3 R2, and Resend clients.
- Implemented AES-256-GCM encryption/decryption helper wrapper.
- Structured app shells, route groups, pages, layouts, and base UI primitives.
- Resolved Next.js 16 linter circular dependency parse errors.
- Fixed React 19 linter warnings regarding synchronous state updates inside effects in custom hooks.
- Configured Webpack build compilation with disabled server minification to bypass Windows native SWC memory overrun crash.
- Integrated Better Auth credentials and Google OAuth login workflows.
- Re-implemented HTML transactional email templates with inline styled JSX divs and Resend mailer triggers.
- Built custom Next.js 16 `proxy.ts` handler providing optimistic cookie-based route protection.
- Rebuilt all authentication forms (Login, Registration, Password Recovery, and Password Reset) using React Hook Form + Zod, complying with strict TS/ESLint criteria.

---

# Technical Debt

- Low priority: `src/constants/cache-keys.ts` declares `CACHE_KEYS` builders (`ENTRY_HOT`, `STATS`, `FLASHBACK`) but `EntryRepository` and `FlashbackService` use ad-hoc string keys (`entries:{userId}:v{n}:...`) instead. Purely a maintainability nit with no perf impact; left untouched during Phase 14 because consolidating the key builders risks churning working version-based invalidation for no gain. Revisit if cache keys are ever centralized.

All Phase 1 modules compile cleanly and pass linter/typecheck verification successfully.

---

# Known Issues

Track active issues.

Example

Editor toolbar overlaps keyboard on Safari.

Priority:

Medium

Status:

Open

---

# Future Ideas

Ideas that should not be implemented immediately.

Examples:

AI Reflection

Semantic Search

Native Mobile App

Voice Journaling

Offline Sync

Do not allow this list to influence the current implementation roadmap.

---

# Working Rules

Every AI assistant should follow these rules.

Before writing code:

1. Read PROJECT_STATE.md.

2. Read the documentation.

3. Understand the current phase.

4. Review recent decisions.

5. Check blockers.

6. Continue only from the active milestone.

Never restart completed work.

Never duplicate completed work.

Never skip phases.

---

# Updating This File

Whenever a meaningful milestone is completed:

Update:

Current Phase

Current Goals

Recent Decisions

Technical Debt

Known Issues

Progress Checklist

Last Updated

Keep this document concise.

Target length:

100–250 lines.

It should remain easy to read at the beginning of every development session.

---

# Definition of Success

A new AI assistant should be able to read only:

- PROJECT_STATE.md
- PRD.md
- DESIGN_SYSTEM.md
- ARCHITECTURE.md
- IMPLEMENTATION_PLAN.md

and immediately understand:

- what Withink is,
- how it should look,
- how it should be built,
- what has already been completed,
- what should be built next.

If those questions are answered clearly,

PROJECT_STATE.md is fulfilling its purpose.