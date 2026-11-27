# Mobile Parity Matrix

Status: living document · started 2026-11-26
Owner: whoever changes behavior on either client

The web app and the Expo app are separate UIs over one domain. Parity is a
property of the shared layers plus a review process, not an accident. This
matrix records, per feature, what each client supports and which shared
module owns the behavior.

**Definition of done for any behavior change:**

1. The logic lives in `@withink/core` (or the wire schema in
   `@withink/contracts`), not in a client-specific module.
2. A test exists in the shared package when the change is domain logic.
3. This matrix is updated in the same PR if any platform's status changed.
4. The change is verified on every platform marked `shipped` (or explicitly
   waived with a written reason).
5. A bug fix gets a shared regression test when the cause was domain logic,
   and is verified on every shipped platform before the issue closes.

Status values: `—` not started · `dev` implemented, unverified · `shipped` ·
`n/a`.

## Feature matrix

| Feature | Web | Expo | Shared owner | Notes |
| --- | --- | --- | --- | --- |
| Email/password auth | shipped | dev | `/api/auth/*` | Verified on Android (SecureStore session + bearer); Expo local profile persisted |
| Google sign-in | shipped | — | `/api/auth/*` | System browser + deep link on native |
| Apple sign-in | — | — | `/api/auth/*` | Required by App Store 4.8 |
| Session / account hint | shipped | dev | `@withink/core` types, `withink-zk` cookie | SecureStore session + SQLite `LocalProfile` (encryption, lock, plan) |
| Lock / unlock | shipped | dev | `LockService`, `/api/unlock` | Master-key unlock, auto-renewed 15-minute token, PIN lock settings and auto-lock; biometric unlock stores the key behind OS authentication. Android pass pending |
| Client-side encryption | shipped | dev | `@withink/core` kdf/crypto contracts | Byte-identical native crypto; change-diary-password implemented on device. Enabling ZK or disabling it remains web-only (the native client opens encrypted diaries only) |
| Journal read/write | shipped | dev | `@withink/core/sync-engine` | Read, decrypt and encrypted write verified on Android |
| Autosave + offline queue | shipped | dev | `LocalStore` adapter | SQLite queue; failed pushes stay queued |
| Sync (push/pull/prune) | shipped | dev | `planSyncPull` in `@withink/core` | Push + pull, foreground sync, sync-status screen, unlock-token renewal |
| Entry editor | shipped | dev | `@withink/editor` | WebView TipTap using the shared factory; formatting sheet, link dialog, image upload, mood, notebook chip, word count, date gates, delete, conflict resolution. Verified on Android. Remaining: iOS, inline image rendering inside the WebView (the gallery renders private images with authenticated headers; the WebView shows a broken image until an image bridge lands) |
| Timeline / search / filters | shipped | dev | `@withink/core/timeline` | Archive with search, mood/time/notebook filters, pagination, calendar, delete and move |
| Calendar | shipped | dev | `@withink/core/date` | Month grid with mood cells and backfill gating |
| Streaks | shipped | dev | `@withink/core/date` | Shared `computeCurrentStreak` |
| Notebooks | shipped | dev | Sync API + `LocalStore` notebooks | CRUD, default notebook, move entry, plan limit |
| Letters (list/compose/seal/reveal) | shipped | — | `/api/letters` + `LettersService` | HTTP endpoints and typed client shipped; native UI not built |
| Insights | shipped | dev | `@withink/core/insights` | Locally computed heatmap, mood, words, activity and monthly overview |
| Flashbacks | shipped | dev | `@withink/core/flashback` | Local selection + device history; full text from the document cache |
| Media (upload/view) | shipped | dev | Server + R2 | Gallery/list, search/sort, lightbox, quota and upload; `GET /api/media` + `DELETE /api/media/<key>` added; delete removes matching image nodes (unit-tested) and scrubs references. Verified on Android: upload, authenticated render, delete; remaining: inline WebView images |
| Export / import | shipped | dev | Server ZIP + local import | Export through the native share sheet; import remains web-only |
| Settings (profile, appearance, data safety) | shipped | dev | `@withink/core` types + `/api/settings/*` | Profile, shared palette/font/accent catalogue, paper scale, sync & data, reminders, security, legal links, account deletion |
| Notifications (web push) | shipped | — | Scheduler + VAPID | Web subscriptions unchanged |
| Notifications (native push) | n/a | dev | Scheduler + `ExpoPushToken` | Preference UI shipped; device-token registration needs EAS/FCM credentials and is not enabled in this build |
| Billing (read-only summary) | shipped (checkout) | dev | `@withink/core/plans` | `/api/billing/summary` rendered read-only; no purchase UI |
| Account deletion | shipped | dev | Server action + `/api/account/delete` | In-app deletion with password confirmation (store requirement) |
| Feedback | shipped | — | Server action; HTTP pending | |

## Parity enforcement points

- **Domain logic:** `packages/core` — zero DOM/Node/Next imports, tested with
  Vitest.
- **Wire contracts:** `packages/contracts` — zod schemas used by routes,
  Server Actions, the API client, and the native client.
- **Editor:** `packages/editor` — the one TipTap extension factory, the
  toolbar-state derivation, the WebView host, and the HTML/JSON parity
  fixtures with committed goldens. The mobile bundle is generated from it and
  a test fails if the committed document drifts from source.
- **Appearance:** `packages/tokens/native.ts` — the palette, accent and
  typography catalogue plus the OKLCH→sRGB resolver. The web catalog
  re-exports it, so a new palette is one edit for both clients.
- **Transport:** `packages/api-client` — the only HTTP client; tested with a
  fake fetch.
- **Adapters:** web declares `LocalStore` / `CryptoProvider`; native must
  implement the same interfaces.
- **Error envelope:** `{ error, code, details? }` from
  `packages/contracts/errors`, produced by `apps/app/src/server/api-error.ts`.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, tests and format on
  every PR.

## Verification checklist per release

- [ ] `pnpm turbo run lint typecheck test` green.
- [ ] Shared golden vectors pass on both crypto implementations.
- [ ] `planSyncPull` tests cover any new sync rule.
- [ ] Editor round-trip fixtures pass (`pnpm --filter @withink/editor test`,
      including a boot of the committed WebView bundle).
- [ ] Matrix has no stale `shipped` claims.
- [ ] Web and native verified against the same account for: create, edit,
      delete, notebook move, letter reveal, media upload.
