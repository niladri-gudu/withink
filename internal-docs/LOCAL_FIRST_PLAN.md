# Withink Local-First Plan (Phase E)


Version: 1.0
Status: Proposed — awaits approval
Owner: Product + Engineering
Companion: `MONETIZATION_PLAN.md` v1.1 (§2.1, §8 Phase E/F)

---

## 1. Goal

Make the app **local-first**: the UI renders from on-device data, and the
server becomes an optional sync/billing target. Concretely:

- No server read before the app shell paints (kills the remaining seconds and
  the cold-start stall).
- The journal, editor, timeline, calendar, notebooks, insights and flashbacks
  keep working offline.
- Sync, backup, billing and push stay online-only and run in the background.
- Zero-knowledge is preserved: the server still only ever sees ciphertext.

This is **not** "delete the backend." It is the Noteflare shape: local-first
client, thin ciphertext sync server.

---

## 2. Non-goals (explicit scope boundary)

Phase E does **not** try to make every feature offline. These stay
server-backed until a later phase, because doing them locally would weaken a
security or storage model:

| Feature | Why it stays server-backed for now |
|---|---|
| Letters to future self | The seal is a server-enforced control (`LettersService.getLetter` withholds the body). A local-only seal is a UX ritual: the device holds the key. Free still gets 1 letter, but sealing/revealing requires a connection. |
| Media / gallery | R2 is the only copy for synced images; quota is server-enforced and fail-closed. Local media needs a blob store and eviction policy — separate phase. |
| Push reminders | Delivery is inherently server-to-device. Local reminders are a possible later fallback. |
| Billing / checkout | Entitlement authority stays on the server. The client may cache the last-known plan for UI only. |
| Account deletion | Still a server operation that purges Mongo/R2/Redis/auth; local data is wiped by the client. |

Everything else (journal, editor, timeline, calendar, streak, notebooks,
insights, flashbacks, export/import) becomes local-first.

---

## 3. Current blockers

Confirmed by reading the code (file refs are `apps/app/src/`):

1. **`app/(app)/layout.tsx:16-46` awaits session + lock + encryption before
   rendering `AppShell`.** This is the root blocker: the `loading.tsx`
   boundary sits *inside* this layout, so no fallback covers the await.
2. **Every `(app)` page is an async RSC** that awaits Mongo/Redis before
   rendering: `app/(app)/page.tsx:24-29`, `entries/page.tsx:31-58`,
   `entries/[date]/page.tsx:61-146`, `insights/page.tsx`, `notebooks/page.tsx`,
   `flashbacks/page.tsx`, `media/page.tsx`, `settings/page.tsx`.
3. **`redirect()` in 13 pages** is the post-proxy auth enforcement.
4. **Server reads of cookies** on the render path: `lib/viewer-today.ts`
   (`withink-local-date`), `insights/page.tsx` (`withink-tz-offset`),
   `settings/page.tsx`, `media/page.tsx`, `feedback/page.tsx`.
5. **Server-seeded props** (`initialEncryptionSettings`, `initialLockSettings`,
   `sessionUnlocked`, `serverToday`) are what keep the shell from flashing the
   wrong gate; without them the client must read local state before paint.
6. **`router.refresh()`** in `app-shell.tsx:196,270` and
   `encryption-provider.tsx:246` re-fetches the RSC tree after unlock / date
   change. Local-first replaces this with store updates.
7. **Server-only imports** (`lib/request-cache.ts`, `lib/viewer-today.ts`,
   `LockService`) cannot enter a client tree. Shared date logic
   (`clampViewerToday`, `computeCurrentStreak`) must move to pure modules.
8. **Proxy gap:** `proxy.ts:6-14` protects `/`, `/entries`, `/flashbacks`,
   `/insights`, `/media`, `/settings`, `/feedback` but not `/notebooks`,
   `/letters`, `/letters/compose`. Those rely only on page-level redirects.
   Fix regardless of this plan.
9. **Missing local fields/features:** `createdAt` is not in the ZK
   `CachedMetadata` (needed for the insights time-of-day histogram); import is
   not implemented; `tab-bar.tsx` calls `getLocalDateString()` during render
   (hydration risk, currently masked by the closed Sheet).

The one existing local-first island is the ZK journal: `diary-cache-db.ts`,
`diary-cache-service.ts`, `journal-sync-service.ts`, `editor-load.ts` and
`use-auto-save.ts` already write/read IndexedDB. Phase E extends that
foundation to the rest of the app.

---

## 4. Target architecture

```
Request
  → CDN: static app shell (no cookies/headers reads in the shell)
  → client boot: read local profile + IndexedDB
      ├─ no profile        → local onboarding (Diary Password)
      ├─ profile + locked  → unlock screen
      └─ profile + unlocked→ app
  → background: if signed in, sync ciphertext + refresh plan (never blocks UI)
```

### Principles

- **IndexedDB is the source of truth** for everything the user can see while
  offline. The server is a replica for sync/backup.
- **No render path awaits the network.** Server actions are for writes and
  background reconciliation, not for first render.
- **Authorization stays server-side for server resources.** The client decides
  what to *show*; the server decides what to *accept* (writes, sync, billing,
  media).
- **The master key remains memory-only.** Local at-rest data is ciphertext;
  the wrapped key lives in the local profile and is unwrapped by the Diary
  Password / PIN.

### New IndexedDB stores (`lib/diary-cache-db.ts`, DB_VERSION → 4)

| Store | Key | Value |
|---|---|---|
| `profile` | `"current"` | `{ id, accountId \| null, createdAt, encryption, lock, lastKnownPlan, planCheckedAt }` |
| `notebooks` | notebook id | `{ id, name, isDefault, createdAt, updatedAt, dirty }` |
| `prefs` | key | UI/editor preferences (non-secret) |
| `flashback_history` | `"current"` | `{ shown: string[], lastPickedDate }` |
| `sync_meta` | key | sync cursors/timestamps |

Existing stores (`metadata_cache`, `document_cache`, `sync_queue`,
`sync_index`) stay. The `profile` record replaces the server-seeded
`initialEncryptionSettings` / `initialLockSettings`.

### Shared core packages (extracted)

`packages/core` (`@withink/core`) and `packages/api-client`
(`@withink/api-client`) now hold the portable layer. The web app re-exports
from core so existing imports/tests keep working.

**`@withink/core` — already extracted:**

- `date.ts`: `getLocalDateString`, `addDays`, `computeCurrentStreak`,
  `backfillWindowStart`, `formatDisplayDate`, `formatNumericDate`.
- `text.ts`: `countWords`.
- `ciphertext.ts`: `CLIENT_CIPHERTEXT_PATTERN`, `isClientCiphertext`,
  `isEncryptedOrEmpty`.
- `encoding.ts`: `hexToBytes`, `bytesToHex`.
- `kdf.ts`: iteration policy + `normalizeKdfIterations`.
- `timeline.ts`: `CachedEntryMetadata`, `buildSearchText`, `createSnippet`,
  `filterLocalTimeline`.
- `letters.ts`: delivery/slot/countdown rules.
- `plans.ts`: `ResolvedPlan`, `Entitlements`, `ENTITLEMENTS`,
  `freeEntitlements`.
- `types.ts`: `EncryptionSettings`, `LockSettings`, `LocalProfile`,
  `NotebookSummary`.
- `crypto.ts`: `Cipher<TKey>`, `KeyDerivation<TKey>`, `CryptoProvider<TKey>`,
  `WrappedMasterKey` (adapters stay platform-specific).
- `storage.ts`: `LocalStore` (IndexedDB on web, SQLite on native).
- `sync.ts`: `SyncListItem`, `SyncEntryPayload`, `SaveEntryPayload`,
  `RemoteApi`, `SYNC_BULK_LIMIT`.

**`@withink/api-client` — already extracted:** `createApiClient(options)` with
`getSyncList`, `getEntries`, `saveEntries`, `saveEntry`, `deleteEntry`,
`getNotebooks`, plus `ApiError`/`SyncRejectedError`. It talks to the new
`/api/sync/{manifest,pull,push,delete,notebooks}` routes and accepts auth
headers (cookie on web, bearer for Expo).

**Extracted (2026-11-26):** `insights.ts` (`computeInsights`) and
`flashback.ts` (selection) now live in `@withink/core`; the web modules are
thin re-exports. **Still app-local:** `calendar.ts` (month aggregation is
derived inline from the timeline) and the sync engine itself — the Expo app
will implement a native engine against `LocalStore` + `RemoteApi`, not
IndexedDB/Server Actions.

---

## 5. Implementation phases

Each phase is independently shippable and reversible. Do not start the next
until typecheck, lint, focused tests and the production build pass.

### E1 — Unblock the shell (performance-first, smallest change) — SHIPPED

Goal: the app shell paints immediately; page data streams after.

**Shipped (2026-11-18): Suspense-streamed shell gate.**

1. `app/(app)/layout.tsx` is now synchronous: it renders
   `<Suspense fallback={<AppShellSkeleton/>}><AppGate>{children}</AppGate></Suspense>`.
   `AppGate` keeps the session/lock/encryption awaits, so the shell fallback
   (`AppShellSkeleton`) paints immediately while the gate resolves.
2. **Content stays server-gated.** `AppGate` still renders `children` only
   after `LockService.isSessionUnlocked`, so a locked session never receives
   page content. A full client bootstrap (rendering children before the gate)
   was deliberately deferred to E2/E4: it would stream page content before the
   lock check — safe for ZK ciphertext, not for legacy plaintext.
3. Fixed `proxy.ts` to protect `/notebooks` and `/letters` (covers
   `/letters/compose`).
4. Fixed the `tab-bar.tsx` render-time `getLocalDateString()` hydration risk.

**Deferred to E2/E4 (when the local profile exists):**
- `LocalBootstrap` client provider + no server read before paint.
- Remove `router.refresh()` from `app-shell.tsx` / `encryption-provider.tsx`
  (the server gate still needs the refresh to re-render after unlock).
- Pages become local-first (`children` no longer await Mongo/Redis).

**Why first:** the shell no longer waits behind a blocking server read, so
opening the app shows the chrome immediately instead of a blank screen. The
page data still streams after the gate in this phase.

**Verification:** first paint contains the shell without waiting on
Mongo/Redis; `x-vercel-id` still `bom1`; network waterfall shows the document
finishing before the page data request; locked/unlocked states still work.

---

### E2 — Local-first journal core

Goal: `/`, `/entries`, `/entries/[date]` render from IndexedDB for ZK users.

**Shipped (2026-11-18) — progressive archive:**
- `/entries` skips `getEntriesPage`, `getEntryStats` and the calendar/date
  reads for ZK accounts. `useLocalJournal` derives calendar + streak from the
  local timeline, renders cached data immediately, and runs the existing bulk
  pull (`syncDiaryCache`) in the background.
- Non-ZK accounts keep the server-seeded path unchanged.
- **Migration:** nothing is rewritten server-side; the local cache is derived
  data. Warm devices render instantly. Cold/incomplete caches render what is
  local and fill in from the bulk pull; an editor date that isn't cached yet
  still falls back to the server in `editor-load.ts`.
- **Dashboard hero (2026-11-18):** today/yesterday and the streak now come
  from the local timeline for ZK accounts (`DashboardHeroLocal`); the
  `getEntryForDate`/`getEntryDates` server reads are skipped.
- **Dashboard lower grid (2026-11-18):** Recent Reflections and the flashback
  read the local timeline for ZK (`selectLocalFlashback`, device-local
  history); the server `getEntriesPage`/`FlashbackService` reads are skipped.
  Letters remain server-backed.
- **Still open in E2:** the editor route's remaining server props and notebook
  labels locally (the `/entries` page still reads `notebooks`/`entitlements`
  from the server for labels and the plan window).

1. **`/entries`**:
   - Remove the server `Promise.all` in `entries/page.tsx`.
   - `EntriesPageShell` receives no data props; `EntriesTimeline` already
     reads IDB for ZK. Migrate the legacy path only if the account is
     non-ZK (keep a server fallback until ZK is mandatory).
   - Derive calendar rows, streak, totals and average words from the local
     timeline via the new `calendar.ts` / `streak.ts` modules.
   - Keep `getEntriesListAction` only as the non-ZK escape hatch.
2. **`/entries/[date]`**:
   - Remove server `getEntryForDate`, entitlements and notebook reads.
   - `JournalEditorShell` uses `editor-load.ts` (already IDB-first).
   - Run the future/backfill window check client-side against the
     last-known plan; the server still re-checks on save (authoritative).
   - Resolve the filing target from the local notebook store; the server
     re-validates ownership on save.
3. **`/` dashboard**:
   - `DashboardHero`, `DashboardLowerGrid`, `RecentReflectionsList` read the
     local timeline instead of server props.
   - Keep `LetterArrival` server-backed (letters are online in Phase E).
4. Replace the cookie date reads on these routes with `getLocalDateString()`;
   keep writing `withink-local-date` for server actions.

**Verification:** airplane mode → unlock → timeline/editor/dashboard render and
save locally; reload works; sync catches up later.

---

### E3 — Notebooks, insights, flashbacks locally

**Shipped (2026-11-26) — insights + flashbacks.**

- `computeInsights` moved to the pure `features/insights/services/insights-compute.ts`;
  `InsightsService` now owns only the Mongo metadata read. ZK accounts compute
  the identical payload from the decrypted local timeline via
  `InsightsDashboard`'s `localMode`, including `createdAt` backfilled into
  `CachedMetadata` by the pull and the push flush (so the time-of-day bucket
  stays accurate).
- `/flashbacks` renders `FlashbackViewLocal` for ZK accounts: anniversary-first
  local selection with the device-local `flashback_history`, rich content read
  from `document_cache`. The card markup is shared through
  `flashback-reader.tsx`; legacy accounts keep the server-chosen path.

**Still open in E3:** the local `notebooks` store and local CRUD/queueing.

1. **Notebooks**: add the `notebooks` store; seed once from the server
   (`listNotebooks`) during bootstrap, then read locally. Create/rename/delete
   update IDB and enqueue a server mutation. Enforce `notebookLimit` in the UI;
   the server enforces on sync/create.
2. **Insights**: add `createdAt` to `CachedMetadata` (backfill on the next
   pull); extract `computeInsights` into a pure module; compute from the local
   timeline and memoize. Keep the server `insights` cache for the non-ZK path.
3. **Flashbacks**: extract the selection logic; store the shuffled history in
   the `flashback_history` store (per-device). Accept that history is no longer
   cross-device.
4. Remove `"use cache"`-dependent server reads from these routes; keep the
   actions for non-ZK accounts and background refresh.

**Verification:** insights/flashbacks render offline and match server output
on a sample journal; notebook limits show the upgrade dialog at the right
count.

---

### E4 — Local profile + optional account

Goal: the app is usable without an account; paid sync is opt-in.

**Foundation shipped (2026-11-20):** `diary_cache` v4 adds a `profile` store
(encryption/lock settings + display-only user hint). `ProfileSeeder` caches
the authoritative server settings after each gate render and sets the
non-sensitive `withink-zk` hint cookie.

**E4b shipped + verified (2026-11-20):** `(app)/layout` reads the
account-scoped `withink-zk` hint and renders `LocalAppShell` from the profile;
reload → unlock → dashboard and sign-out cleanup were verified with a
throwaway dev account. Accounts without the hint keep the server gate.

1. **Onboarding**: if no `profile` exists, create one locally:
   - Diary Password → PBKDF2 → wrapped master key; store salt,
     verification ciphertext, KDF iterations in `profile`.
   - Lock settings (optional passcode) stored in `profile`.
2. **Anonymous mode**:
   - `/`, `/entries`, `/entries/[date]`, `/insights`, `/flashbacks`,
     `/notebooks` no longer require a session.
   - `proxy.ts` stops redirecting those routes (or redirects only for
     server-backed routes: `/letters`, `/media`, `/settings` billing).
   - The header shows "Local profile · Sign in to sync."
3. **Link to account**:
   - "Create account / Sign in" flow; on success, upload the local profile's
     encryption settings and encrypted entries in batches (reuse the migration
     `bulkWrite` pattern), set `profile.accountId`, then enable background
     sync.
   - The master key is unchanged, so local ciphertext stays decryptable.
4. **Paid gates**: sync, cloud backup, letters, media and billing require an
   account. The client shows the plan; the server enforces.

**Verification:** fresh browser → create a local diary without an account;
write entries; sign up → data appears in Mongo as ciphertext and syncs to a
second device.

---

### E5 — Data safety (non-negotiable for local-first)

**Shipped (2026-11-26): import + device storage safety.**

1. **Import** — SHIPPED (2026-11-21): the export ZIP is parsed client-side,
   existing dates are skipped, and entries are encrypted locally then queued.
2. **Backup nudges** — PARTIAL: Settings → Your data shows the age of the last
   archive downloaded from this device and points at Export; a proactive
   dashboard nudge is still open.
3. **Persistent storage** — SHIPPED: the "On this device" card reports whether
   the browser has granted eviction protection and can request it.
4. **Storage pressure** — SHIPPED: the same card shows used bytes vs. quota, and
   the "Rebuild local cache" action re-downloads the encrypted journal after
   flushing unsynced edits.

The original scope follows for reference:

1. **Import** in `features/export`: parse the existing export archive
   (`metadata.json` + `entries/*.html|.txt`) and write encrypted records to
   IDB. Add a `formatVersion` to the manifest going forward.
2. **Backup nudges**: if the last export is older than N days (or there is no
   account), show a non-blocking prompt; add a Settings "Back up now" action.
3. **Persistent storage**: keep `requestPersistentStorage()`; surface a warning
   when it is denied, plus an install-app prompt.
4. **Storage pressure**: estimate `navigator.storage.estimate()`; warn before
   media/attachments fill the quota.

**Verification:** export → clear site data → import restores entries; denied
persistence shows the warning.

---

### E6 — Sync hardening

1. Sync is **background-only**: `journalSyncService` already coalesces runs;
   remove any render-time awaits and show a quiet "Synced / Pending / Offline"
   indicator.
2. **Conflicts**: keep last-write-wins per date for now; add an entry `version`
   so a stale push is rejected (Noteflare-style). Merge UI is a later phase.
3. **Entitlements**: cache `lastKnownPlan`; refresh on boot and after billing
   actions. The server rejects out-of-window/over-quota writes at sync; the UI
   must surface a rejected item with a clear recovery path (save it locally,
   prompt to upgrade, or adjust the date).
4. **Auth expiry**: if the session expires, keep working locally and show
   "Sign in to sync"; never block the journal.

---

### E7 — Cleanup and rollout

1. Remove server render paths that are now dead (keep sync/billing/letters/
   media APIs).
2. Update `ARCHITECTURE.md` and `internal-docs/CLAUDE.md`: the "prefer Server
   Components" rule now applies to server-backed features, not the journal
   surface. Record the local-first boundary.
3. Update `PROJECT_STATE.md` with the completed phases.
4. Remove the feature flag; measure Speed Insights / TTFB / offline behavior.

---

## 6. Feature matrix (target end-state)

| Feature | Local source | Server role | Phase |
|---|---|---|---|
| Timeline / search | IDB | sync replica | E2 |
| Editor / autosave | IDB (ZK) | sync queue | E2 |
| Calendar / streak | IDB metadata | sync replica | E2 |
| Dashboard cards | IDB | sync replica | E2 |
| Notebooks | IDB | sync + limit enforcement | E3 |
| Insights | IDB metadata | optional precompute | E3 |
| Flashbacks | IDB + local history | optional | E3 |
| Export | client (existing) | — | E5 |
| Import | client | — | E5 |
| Letters | — | server seal (online) | later |
| Media | — | R2 + quota (online) | later |
| Billing | cached plan | authoritative | E4/E6 |
| Push | — | server push | later |

---

## 7. Security-model changes (must be explicit)

1. **Lock becomes a client gate.** With no RSC content, the server no longer
   withholds page content. The real gate is the master key: local ciphertext
   is unreadable without it. Server actions still enforce the `withink-unlocked`
   cookie for writes/sync. Document this in `ARCHITECTURE.md`.
2. **Letters stay server-sealed.** Do not move the seal client-side unless the
   product accepts it as a ritual (or adopts time-lock cryptography). This is
   why letters are out of Phase E scope.
3. **Entitlements are UI-cached, server-authoritative.** A Free local user can
   create an out-of-window entry offline; the UI warns, and the server rejects
   it at sync. Never rely on the cached plan to grant server resources.
4. **A local profile is not an account.** It has no recovery beyond the Diary
   Password and the export file. Onboarding must say so.
5. **Account linking uploads ciphertext only.** Reuse the existing ZK
   migration path; never send plaintext.

---

## 8. Migration

- **Existing ZK user (the current account):** the IDB cache is already
  populated. On first E1/E2 boot, seed the `profile` record from the server
  settings once (post-paint), then use it locally. No data re-upload.
- **Existing legacy (non-ZK) account:** keep the server path until the account
  is migrated to ZK; local-first is enabled per-account
  (`encryption.isClientEncrypted`).
- **New local profile → account:** upload in batches using the existing
  `bulkWrite` migration pattern; set `accountId`; enable sync.
- **DB version 3 → 4:** additive stores only; no destructive upgrade.

---

## 9. Testing & verification

**Automated**

- Unit tests for every extracted pure module (`today`, `streak`, `insights`,
  `flashback`, `calendar`) against the current server output.
- Local profile bootstrap: fresh / locked / unlocked / signed-out / offline.
- Import round-trip: export → clear → import → identical entries.
- Sync: pending push, offline queue, rejected out-of-window entry, last-write-
  wins, no pending clobbering (existing tests must stay green).

**Manual / E2E**

- Offline first load: airplane mode → shell paints → unlock → timeline/editor
  work.
- Network waterfall: document + shell finish before any sync request.
- Locked session: content is not visible until unlock; reload re-locks.
- Account linking: local data survives sign-in and appears on a second device.
- Export/import on a clean browser profile.

**Guardrails**

- `pnpm typecheck`, `pnpm lint`, focused `vitest`, production `build` after
  each phase.
- Measure before/after: Speed Insights p75 TTFB/LCP, root JS size, request
  count on first load.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Data loss from browser eviction / user clearing storage | Persistent-storage request, backup nudges, import, install prompt; say it plainly during onboarding. |
| Local encryption/key mistakes | Reuse `crypto-client` and the existing wrapped-key flow; unit-test the local profile round-trip. |
| Entitlement bypass offline | UI-cached plan + server rejection at sync; never treat the client as authority for paid resources. |
| Duplicate/conflicting writes across devices | Version field + last-write-wins; surface rejected/conflicted items. |
| Large refactor destabilizing a live app | Phased, flag-gated; keep server code; ship E1 alone first and measure. |
| `server-only` import leaks into the client tree | Pure-module extraction; build fails fast if violated. |
| Letters/media expectations | Explicitly out of scope; keep them server-backed and say so in the UI when offline. |

---

## 11. Recommended first slice

Ship **E1 only** first:

- Static shell + `LocalBootstrap`.
- Remove the blocking layout awaits and the `router.refresh()` calls.
- Fix the proxy gaps.

This is a small, reversible change that removes the server read in front of
first paint — the remaining "seconds" — without touching the data model. Once
measured in production, proceed to E2 (journal core) and E4 (anonymous mode)
in that order.
