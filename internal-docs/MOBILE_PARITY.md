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
| Email/password auth | shipped | dev | `/api/auth/*` | Verified on Android Expo Go (SecureStore session + bearer) |
| Google sign-in | shipped | — | `/api/auth/*` | System browser + deep link on native |
| Apple sign-in | — | — | `/api/auth/*` | Required by App Store 4.8 |
| Session / account hint | shipped | dev | `@withink/core` types, `withink-zk` cookie | Expo stores the session in SecureStore; local profile pending |
| Lock / unlock | shipped | dev | `LockService`, `/api/unlock` | Master-key unlock + 15-minute token verified on Android; biometrics pending |
| Client-side encryption | shipped | dev | `@withink/core` kdf/crypto contracts | PBKDF2 in a native module (self-tested) on a background thread; WebView and pure-JS fallbacks; AES-GCM/HKDF in noble; golden vectors pass; device unlock + decrypt verified |
| Journal read/write | shipped | dev | `@withink/core/sync-engine` | Read, decrypt and encrypted write verified on the Pixel 4 emulator |
| Autosave + offline queue | shipped | dev | `LocalStore` adapter | SQLite queue; an offline edit stayed queued and flushed on reconnect |
| Sync (push/pull/prune) | shipped | dev | `planSyncPull` in `@withink/core` | Push + pull verified on device; prune covered by unit tests |
| Entry editor | shipped | dev | Editor fixtures (planned) | Plain-text editor on native (regenerates HTML/JSON); TipTap DOM on web |
| Timeline / search / filters | shipped | — | `@withink/core/timeline` | |
| Calendar | shipped | — | `@withink/core/date` | |
| Streaks | shipped | — | `@withink/core/date` | |
| Notebooks | shipped | — | Sync API + `LocalStore` notebooks | Local store landed in DB v5 |
| Letters (list/compose/seal/reveal) | shipped | — | Server; HTTP endpoints pending | Server-sealed |
| Insights | shipped | — | `@withink/core/insights` | Local computation |
| Flashbacks | shipped | — | `@withink/core/flashback` | Local selection |
| Media (upload/view) | shipped | — | Server + R2 | Bearer session + `X-Withink-Unlock` accepted |
| Export / import | shipped | — | Server ZIP + local import | Bearer + unlock token accepted; native adds share sheet |
| Settings (profile, appearance, data safety) | shipped | — | `@withink/core` types | |
| Notifications (web push) | shipped | — | Scheduler + VAPID | Native needs Expo push tokens |
| Notifications (native push) | n/a | — | Scheduler + device tokens | |
| Billing (read-only summary) | shipped (checkout) | — | `@withink/core/plans` | No purchase UI in the native app |
| Account deletion | shipped | — | Server action; HTTP pending | Required by stores |
| Feedback | shipped | — | Server action; HTTP pending | |

## Parity enforcement points

- **Domain logic:** `packages/core` — zero DOM/Node/Next imports, tested with
  Vitest.
- **Wire contracts:** `packages/contracts` — zod schemas used by routes,
  Server Actions, the API client, and the native client.
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
- [ ] Editor round-trip fixtures pass (once the native editor exists).
- [ ] Matrix has no stale `shipped` claims.
- [ ] Web and native verified against the same account for: create, edit,
      delete, notebook move, letter reveal, media upload.
