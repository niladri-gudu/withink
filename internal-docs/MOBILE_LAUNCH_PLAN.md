# Mobile Launch Plan — Expo Native Client

Status: decided · 2026-11-26
Decision: **Expo native app** (chosen over a Capacitor shell)
Supersedes: the earlier PWA-first plan (written before the local-first refactor)

---

## 1. Why the plan changed

The previous plan assumed a server-rendered app with 42+ Server Actions, cookie-only
auth, and crypto that lived only in the web client. On that basis it recommended a
hardened PWA and deferred native.

That basis no longer holds:

| Old assumption | Current reality | Evidence |
| --- | --- | --- |
| Server is the source of truth | IndexedDB is the source of truth for the journal; the server is a sync replica | `internal-docs/LOCAL_FIRST_PLAN.md:101` |
| No HTTP API for journal data | `/api/sync/{manifest,pull,push,delete,notebooks}` with rate limits and validation | `apps/app/src/app/api/sync/*` |
| Cookie-only auth | Better Auth `bearer()` plugin; sync routes skip the unlock cookie for bearer requests | `apps/app/src/lib/auth.ts:190`, `apps/app/src/app/api/sync/_lib.ts:40-55` |
| Domain logic trapped in the web app | Framework-neutral `@withink/core` (insights, flashback, letters, plans, dates, sync/crypto/storage contracts) | `packages/core/src/index.ts` |
| No native client plumbing | `@withink/api-client` typed HTTP client | `packages/api-client/src/client.ts` |
| No mobile groundwork | "Mobile readiness for the Expo client" shipped | commit `d4e0c05` |
| Push reminders unbuilt | Web push + scheduler shipped | commit `40d0a7c`, `apps/app/src/features/notifications/` |

A native client is now feasible, and the repository was deliberately shaped for it
(`internal-docs/CLAUDE.md:72-80`: "shared by web and the future Expo app"; `LocalStore`
"IndexedDB on web, SQLite on native").

The chosen path is Expo. The trade-off is explicit: a second UI codebase, with parity
enforced by shared packages, contracts, tests and CI rather than by construction.

---

## 2. The parity requirement

Your requirement: *"features and bugs should be similar in both platforms — if I change
it for web, it should change for the mobile app as well."*

| Level | Meaning | Expo outcome |
| --- | --- | --- |
| **P0 Feature parity** | Both apps expose the same features | Required for public launch |
| **P1 Bug parity** | A bug fixed on web is fixed on mobile in the same release window | Required for every fix |
| **P2 Code parity** | One implementation; a web change *is* a mobile change | **Not achievable** for UI; achievable for domain logic and wire contracts |
| **P3 UX parity** | Same layout, language and interaction model | Achievable via shared tokens + a mirrored design system |

With Expo, P2 is reachable for **domain behavior** and **wire format**, never for UI.
The plan therefore treats parity as an engineering product with enforcement points
(§6), not as an aspiration.

**Public launch rule:** no public store release until the parity matrix is green for
every shipped feature. TestFlight/internal builds may trail the web app during
development.

---

## 3. Current-state audit

### 3.1 Sources of truth

| Data | Source of truth | Server role |
| --- | --- | --- |
| Entries, timeline, calendar, streak, editor | IndexedDB on web; SQLite on native | sync replica |
| Notebooks | server today (local store is open E3 work) | authoritative for limits |
| Profile (lock + encryption settings, plan hint) | local `profile` record, seeded from server | seeds once |
| Letters | server (seal is server-enforced) | authoritative |
| Media | R2 + server quota | authoritative |
| Billing / entitlements | server | authoritative, UI may cache |
| Insights / flashbacks | computed locally from local entries | optional precompute |
| Push | server → device | authoritative |

### 3.2 Transport inventory

- **52 exported Server Actions** in 13 files (journal 10, lock 7, letters 6, notebooks 6,
  notifications 5, encryption 4, billing 3, media 3, auth 1, feedback 1, flashbacks 1,
  insights 1, settings 1). Server Actions are not callable by a native client.
- **14 route handlers**: auth catch-all, sync (5), media (2), export, monitoring (2),
  cron, health, Dodo webhook.
- **Callable over HTTP today**: `/api/auth/*`, `/api/sync/*`, `/api/media/*` (cookie +
  unlock gated), `/api/export` (cookie + unlock gated).
- **No HTTP equivalents**: lock/unlock, encryption setup and password change, letters,
  notification settings and device tokens, billing, media *actions*, account deletion,
  feedback.

### 3.3 Shared-package reuse

| Package | Verdict for React Native | Evidence |
| --- | --- | --- |
| `@withink/core` | Reusable unchanged; zero runtime deps, no DOM/Node/Next imports | `packages/core/package.json` |
| `@withink/api-client` | Reusable unchanged; `fetch` + header injection | `packages/api-client/src/types.ts:47-63` |
| `@withink/ui` | Web-only: React DOM, Radix, Tailwind | `packages/ui/src/*` |
| `@withink/theme` | Web-only: `next-themes`, `document`, `matchMedia` | `packages/theme/src/theme-provider.tsx` |
| `@withink/tokens` | Web-only CSS, but values are portable | `packages/tokens/theme.css` |
| `@withink/utils` | Not useful on native (`cn()` only) | `packages/utils/src/index.ts` |

The zero-knowledge **implementation** is still app-local: `apps/app/src/lib/crypto-client.ts`
uses `crypto.subtle`, and `crypto-worker-client.ts` uses a Web Worker. Only the iteration
policy (`packages/core/src/kdf.ts`), encoding, ciphertext checks and adapter interfaces
are shared. Native needs a byte-exact implementation.

### 3.4 Parity infrastructure gaps

- **No tests in `packages/core` or `packages/api-client`.** All 34 test files live in
  `apps/app`.
- **No CI.** `.github/` was removed in `36c83f6`; no husky/lint-staged.
- **Wire contracts are duplicated.** Zod schemas live only in `apps/app`
  (`apps/app/src/features/journal/validation/entry-schema.ts`,
  `apps/app/src/app/api/sync/push/route.ts`); `packages/core` has TS types but not
  validators. `SyncIndexRecord` is defined twice.
- **Adapter interfaces are not enforced.** `LocalStore`, `CryptoProvider` and `RemoteApi`
  exist in `packages/core`, but web adapters don't declare `implements`.
- **`@withink/api-client` has no consumer and no tests.**
- **Two server paths for entries** (Server Actions vs `/api/sync/push`), with no contract
  test proving equivalence.
- **Server-side flashback selection diverges** from the shared local rule.
- **Cron schedule is not version-controlled** (`apps/app/vercel.json` missing).

---

## 4. Decision: Expo native app

Capacitor was the alternative (single codebase, automatic parity, ~3–4 weeks to a store
listing). It was rejected because the priority is native UX and a genuine native client,
accepting a second UI codebase and a longer timeline.

What Expo buys:

- Native navigation, gestures, keyboard handling, typography and performance.
- Native SQLite storage, Keychain/Keystore, biometrics, camera, share sheet, deep links.
- Reliable native push (APNs/FCM via Expo Push Service) and background sync.
- Normal App Store review instead of a WebView-wrapper 4.2/2.5.2 risk.

What it costs:

- Every screen is rebuilt; `packages/ui`, `tailwind`, Radix and the TipTap-based editor
  do not carry over.
- Every feature change and bug fix must be implemented or verified twice.
- Every missing Server Action needs an HTTP endpoint.
- Native crypto and storage adapters must be byte-compatible with the web.
- Realistic effort: **16–24 weeks part-time**, not 1–2 months.

The Capacitor path remains the documented fallback (§10) if the store timeline becomes
critical or the scope proves unmanageable.

---

## 5. Revised roadmap

### Phase 0 — Parity foundation (required before mobile code; ~2 weeks part-time)

This also closes most of roadmap item E6 (sync hardening), so it is not mobile-only work.

1. **Extract the sync engine into `@withink/core`.** Move push/pull/merge/queue logic out
   of `apps/app/src/features/journal/services/journal-sync-service.ts` into
   `createSyncEngine(store: LocalStore, api: RemoteApi)`. Web and native run identical
   behavior; only the adapters differ.
2. **Create `@withink/contracts`.** Move wire zod schemas (`saveEntrySchema`, `pushSchema`,
   notebook actions, sync envelopes) out of `apps/app` and export inferred types. Server
   routes, Server Actions and both clients import one source.
3. **Enforce adapter contracts.** `diary-cache-db.ts` declares `implements LocalStore`;
   `crypto-client.ts` declares `implements CryptoProvider`; remove the duplicate
   `SyncIndexRecord`.
4. **Unify the error envelope** (`{ code, message, details? }`) with shared codes.
5. **Add the missing tests:** unit tests in `packages/core` and `packages/api-client`;
   golden crypto vectors (fixed key/nonce/password → fixed ciphertext, KDF output, unlock
   proof); sync-engine tests against an in-memory `LocalStore`; contract tests that send
   the same payloads to `/api/sync/push` and the equivalent Server Action and compare.
6. **Restore CI** (`.github/workflows/ci.yml`): install, lint, typecheck, test, build,
   format for every app and package. PR template asks "does this change the parity
   matrix?"
7. **Create `internal-docs/MOBILE_PARITY.md`**: one row per feature, one column per
   platform, updated in the same PR as any behavior change.
8. **Device identity:** each install gets an id and counts toward the synced-device cap
   (`MONETIZATION_PLAN.md:231-233`), so web and native sessions are consistent.

**Phase 0 status (2026-11-26): shipped.**

- `@withink/contracts` owns the entry/sync/notebook wire schemas and the
  `{ error, code, details? }` envelope; the app's `entry-schema.ts` is a re-export.
- `planSyncPull` + `syncListFingerprint` live in `@withink/core/sync-engine` and drive
  the web pull; prune/fetch rules are tested (11 cases).
- Web adapters declare `LocalStore` (IndexedDB, including a derived notebooks store at
  DB v5) and `CryptoProvider`; the duplicate `SyncIndexRecord` is gone.
- Sync routes return coded errors; `@withink/api-client` parses code/details.
- CI is restored; core, contracts, API-client and crypto golden-vector tests run in the
  workspace suite.
- Device identity moved to Phase 2 — it needs the synced-device cap and would be dead
  weight before that cap lands.
- Full push/pull orchestration still lives in `diary-cache-service`; the decision logic
  is shared, and the loop can move onto `LocalStore` + `RemoteApi` when the native
  adapter exists (Phase 3).

### Phase 1 — PWA tail (parallel, small)

Already shipped: manifest/icons/shortcuts, iOS standalone meta, service-worker precache,
`storage.persist()`, install card, web push.

Remaining: Safari editor toolbar/keyboard overlap (`PROJECT_STATE.md:1017`), proactive
backup nudge (E5 partial), local notebooks (E3 tail — also needed for native parity),
cron schedule in `apps/app/vercel.json`, push env vars, device verification.

### Phase 2 — Server surface for native (~3 weeks, overlaps mobile phases)

Add HTTP endpoints that wrap the same services as the existing actions. Recommended set:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/*` + `expo()` Better Auth plugin | session in SecureStore, social sign-in with deep-link callback |
| `POST /api/unlock` | verify HKDF proof, return a short-lived signed unlock token |
| `GET/POST /api/settings/lock` | lock settings, reset-email flow |
| `GET/POST /api/settings/encryption` | enable/disable client encryption, change diary password |
| `GET/POST /api/notifications/settings` | reminder preferences |
| `POST/DELETE /api/notifications/devices` | Expo push token registration and pruning |
| `GET/POST/DELETE /api/letters` | list, compose/seal, delete |
| `POST /api/letters/[id]/reveal` | reveal a sealed letter |
| `GET /api/billing/summary` | read-only plan state (no purchase UI) |
| `POST /api/account/delete` | in-app account deletion (store requirement) |
| Bearer + unlock-token support on `/api/media/*` and `/api/export` | native media/export |

Rules: every endpoint uses `@withink/contracts` schemas, the shared error envelope,
rate limits comparable to the actions, and the same service layer. No business logic in
the route. `/api/sync/*` already models the pattern.

**Phase 2 status (2026-11-26): started.**

- `POST /api/unlock` shipped: verifies the HKDF proof and returns a 15-minute
  AES-GCM token. The web keeps its HttpOnly unlock cookie; native requests
  send the token in `X-Withink-Unlock`, now accepted by media and export.
- The Better Auth Expo client plugin lives in `apps/mobile`. The server half
  (copying `expo-origin` into `Origin` before Better Auth's CSRF check) is a
  small local plugin, so the RN-heavy package never enters the web app.
- Remaining: settings/lock/encryption endpoints, letters, notification device
  tokens, billing summary, and account deletion.

### Phase 3 — Expo foundation (~4 weeks)

**Phase 3 status (2026-11-26): started.**

- `apps/mobile` scaffolded (Expo SDK 58, Expo Router, TypeScript) and added to
  the pnpm workspace; Metro resolves the shared source packages.
- Better Auth Expo client stores the session in SecureStore; a local
  `expoOriginPlugin` handles the `expo-origin` → `Origin` translation for
  Better Auth's CSRF check.
- Verified on an Android device via Expo Go: sign-up → sign-in → bearer
  `/api/sync/manifest` → sign-out.
- Next: the crypto spike (unlock proof + decryption), SQLite `LocalStore`, and
  the editor round-trip spike.

1. `apps/mobile` with Expo Router + TypeScript, added to the pnpm workspace.
2. `@withink/tokens/native`: a TS token object generated from the same values as
   `packages/tokens/theme.css` (color, spacing, radius, typography). One source of truth
   for P3 parity.
3. **Crypto spike (blocking):** byte-exact PBKDF2-SHA256 (600k/210k/100k/50k),
   AES-GCM `iv:ciphertext`, HKDF unlock proof. Candidates: `react-native-quick-crypto`
   (JSI) or a small native module. `expo-crypto` alone is insufficient (no AES-GCM).
   Measure 600k-iteration time on a mid-range Android device; if too slow, iterate on a
   native thread, not the JS thread. Validate with the Phase 0 golden vectors.
4. **SQLite `LocalStore`:** `expo-sqlite` implementation of every method in
   `packages/core/src/storage.ts` (metadata, documents, sync queue, sync index, profile,
   notebooks). Same ciphertext and schema-version semantics as IndexedDB.
5. **Auth + unlock:** Better Auth Expo plugin, SecureStore session, Google and Apple
   sign-in via system browser + deep link, wrapped master key in Keychain/Keystore,
   biometric gate.
6. **Sync engine:** consume the shared engine; sync on unlock, foreground, after writes,
   and via `expo-background-task`; show the same sync status surface as web.

Exit: sign in → unlock → timeline rendered from SQLite → entry written, encrypted,
synced → verified against the web account.

### Phase 4 — Journal parity (~4 weeks)

1. **Editor spike (highest risk).** TipTap/ProseMirror is DOM-only. Evaluate
   `@10play/tentap-editor` (TipTap inside a bridged WebView) first because it preserves
   the extension/schema and the exact `contentHtml`/`contentJson` format. Fallback:
   a native rich-text editor with strict HTML round-trip tests against web fixtures.
   **The editor must produce byte-identical content for the same input**, or web and
   mobile will corrupt each other's formatting.
2. Editor chrome parity: toolbar, formatting sheet, keyboard insets, autosave, word count,
   mood, notebook selection, backfill gates.
3. Timeline, calendar, search, filters, streak, Today dashboard, flashbacks and insights
   from the shared core.
4. Media: picker/camera, presigned upload with bearer + unlock token, gallery, lightbox,
   quota errors.
5. Notebooks: local store + CRUD over the sync API; remove the remaining server-only
   journal reads.

Exit: the journal feature set passes the parity matrix side by side with web.

### Phase 5 — Account parity (~3 weeks)

Settings (profile, appearance, local data/device safety, sync status, reminders, privacy,
export/import), lock and encryption flows, letter list/compose/seal/reveal, feedback,
read-only billing summary, account deletion.

### Phase 6 — Store launch (~3 weeks)

Sign in with Apple (required alongside Google), privacy policy and disclosures, privacy
manifest, encryption export compliance, push permission copy, store listings and
screenshots, TestFlight, Play internal testing, staged rollout.

**Launch gate:** `MOBILE_PARITY.md` green for every shipped feature; core + contract tests
green in CI; crash-free sessions and E2E flows passing on both platforms.

---

## 6. The parity contract (how "fix once, both platforms" is enforced)

1. **Domain logic lives in `@withink/core` only.** Dates, insights, flashbacks, letter
   rules, plans, timeline filters and the sync engine. No computation in either client
   that the other cannot run.
2. **Wire shapes live in `@withink/contracts` only.** Zod schema + inferred type, used by
   routes, actions and both clients. No local re-declarations.
3. **One server service layer.** Actions and routes are thin adapters over the same
   services; no business rule in either.
4. **Adapters declare their interfaces.** `implements LocalStore`, `CryptoProvider`,
   `RemoteApi`; `tsc` catches drift.
5. **Golden fixtures.** Crypto vectors, sync conflict cases, insights/flashback fixtures
   and editor HTML/JSON round-trip fixtures live in shared test packages and run against
   every implementation.
6. **Contract tests.** The same request fixtures hit `/api/sync/*` and the equivalent
   Server Action; responses must match.
7. **CI is mandatory.** No mobile merge without lint, typecheck, core tests, contract tests
   and the app suite.
8. **Parity matrix in the PR template.** Any behavior change updates
   `internal-docs/MOBILE_PARITY.md` for every platform.
9. **Bug parity process.** One tracker with a `platform` field. A bug is not done until it
   is verified or explicitly waived on every shipped platform. Domain-caused bugs get a
   shared regression test.
10. **Release model.** Web deploys continuously. Mobile ships JS via EAS Update for parity
    fixes (Apple permits JS-only updates that do not change the app's primary purpose) and
    a store binary only for native changes. The parity matrix records the last mobile
    version verified against web.

The live per-feature matrix is `internal-docs/MOBILE_PARITY.md`; update it in the
same PR as any behavior change.

### Editor parity addendum

The editor is the only feature that cannot simply share code. Treat it as a contract:

- Shared fixtures: a corpus of documents (marks, lists, links, images, Bengali text,
  long-form) stored as HTML + JSON.
- Both editors must parse, edit and re-serialize them to an identical normalized form.
- Any change to web editor extensions requires a matching fixture update and a mobile
  test run in the same PR.

---

## 7. Platform capability matrix

| Feature | Web (today) | Expo target | Server work needed |
| --- | --- | --- | --- |
| Auth (email/password) | yes | yes | Expo plugin, trusted origins |
| Auth (Google) | yes | yes (system browser + deep link) | Expo plugin callback |
| Auth (Apple) | no | yes (required by 4.8) | Apple provider |
| Unlock / lock | yes | yes + biometrics | `/api/unlock` token |
| Journal read/write/sync | yes | yes (SQLite adapter) | none |
| Editor | TipTap DOM | bridged TipTap / native (spike) | none |
| Notebooks | yes | yes | local store + sync API |
| Letters | yes | yes | letters HTTP endpoints |
| Insights / flashbacks | yes | yes (shared core) | none |
| Media upload/view | yes | yes | bearer + unlock token |
| Settings (lock/encryption/notifications) | yes | yes | settings HTTP endpoints |
| Export / import | yes | yes + share sheet | bearer export |
| Billing | web checkout | read-only summary, no purchase UI | summary endpoint |
| Push reminders | web push | native via Expo Push Service | device-token endpoint + provider |
| Account deletion | yes | yes | delete endpoint |

---

## 8. Store and compliance checklist

- **Guideline 4.8**: Sign in with Apple is required because Google sign-in is present.
- **Guideline 3.1.1**: no purchase UI and no steering to web checkout inside the binary.
  Show plan state read-only and describe subscriptions as web-managed. Regional rules
  vary; verify before submission.
- **Guideline 5.1.1**: privacy policy URL, data-collection disclosures, privacy manifest,
  in-app account deletion.
- **Encryption export compliance**: standard AES/PBKDF2; key material stays device-local.
- **Push**: permission copy, opt-out honored, no marketing via notifications.
- **Data safety / Play**: declare encrypted data, account deletion, data transfer.

---

## 9. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Editor divergence | content corruption across web/mobile | bridged TipTap first; shared HTML/JSON fixtures; format freeze |
| Native crypto incompatibility | unreadable diaries | golden vectors in Phase 0; byte-exact adapters |
| PBKDF2 600k too slow on Android | unusable unlock | JSI/native thread; measure on mid-range device; keep iteration policy shared |
| Two UIs drift | broken parity promise | contracts + parity matrix + CI + bug process |
| Background sync limits (iOS) | delayed sync | foreground + post-write sync; background as best-effort |
| Media/export auth gap | feature blocked | `/api/unlock` short-lived token; bearer support |
| App Store price-steering rules | billing UX constraints | read-only plan state, no links |
| Expo SDK upgrades | churn | pin SDK; upgrade in a dedicated PR with a parity run |
| Scope (16–24 weeks) | launch slips | phase gates; TestFlight early; Capacitor fallback |

---

## 10. Timeline and fallback

| Phase | Work | Duration | Target |
| --- | --- | --- | --- |
| 0 | Parity foundation + E6 overlap | 2 weeks | 2026-12-10 |
| 1 | PWA tail + local notebooks | 1 week | 2026-12-17 |
| 2 | Native HTTP surface + auth/unlock | 3 weeks | 2027-01-07 |
| 3 | Expo foundation (crypto, SQLite, sync, auth) | 4 weeks | 2027-02-04 |
| 4 | Journal parity (editor spike first) | 4 weeks | 2027-03-04 |
| 5 | Account parity (settings, letters, export, billing) | 3 weeks | 2027-03-25 |
| 6 | Store launch | 3 weeks | 2027-04-15 |

Part-time, solo. TestFlight from Phase 3 onward; public launch only when the parity
matrix is green.

**Capacitor fallback:** if Phase 4 (editor) or Phase 5 proves unmanageable, or a store
listing is needed sooner, switch to the Capacitor shell described in the previous revision
of this plan. Phase 0 and the Phase 2 HTTP surface remain useful either way.

---

## 11. Decisions

1. **Expo native app** — chosen.
2. **Editor approach** — bridged TipTap (`@10play/tentap-editor`) preferred; native editor
   only if round-trip fixtures pass. Decide during the Phase 4 spike.
3. **Push** — Expo Push Service over expo-notifications; keep web push for the PWA.
4. **Auth** — Better Auth Expo plugin + SecureStore; Apple sign-in added.
5. **Unlock token** — short-lived signed token from `/api/unlock` for native media/export.
6. **Billing** — read-only in-app summary; no purchase UI or steering links.
7. **Public launch** — gated on a green parity matrix.
