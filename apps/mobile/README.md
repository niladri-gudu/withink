# @withink/mobile

Expo (React Native) client for Withink. It shares the journal domain, wire
contracts, and HTTP client with the web app:

- `@withink/core` — dates, insights, flashbacks, plans, sync planning
- `@withink/contracts` — zod wire schemas and the API error envelope
- `@withink/api-client` — typed sync client (bearer auth on native)

Authentication uses Better Auth's Expo client: the session lives in SecureStore
and the derived session token authorizes `/api/sync/*`.

## Run on Android (USB device or emulator)

Development build (required for the native PBKDF2 module):

```bash
# from the repo root; `adb devices` should list one target
adb reverse tcp:3000 tcp:3000   # Next.js API

pnpm --filter @withink/app dev   # terminal 1

cd apps/mobile
npx expo run:android             # terminal 2: builds, installs, starts Metro
```

The first Gradle build downloads the Android Gradle plugin, SDK platform, NDK
and React Native artifacts and takes a while; later builds are incremental.

Expo Go is still supported for JavaScript-only work. It cannot load custom
native code, so the app falls back to the hidden WebView's WebCrypto for
PBKDF2:

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081

pnpm --filter @withink/app dev                               # terminal 1
pnpm --filter @withink/mobile start -- --localhost --android # terminal 2
```

`EXPO_PUBLIC_API_URL` defaults to `http://localhost:3000`; override it for a
LAN or production origin:

```bash
EXPO_PUBLIC_API_URL=https://app.withink.me pnpm --filter @withink/mobile start
```

## Checks

```bash
pnpm --filter @withink/mobile typecheck
pnpm --filter @withink/mobile lint
```

## Current slice

Sign-up/sign-in, encrypted unlock, and a local-first journal: pages are pulled,
decrypted and persisted to SQLite; the editor stores encrypted documents,
writes a plaintext sync index, queues an encrypted pending write, and flushes it
to `/api/sync/push`. On a cold start the list renders from SQLite after unlock,
and failed pushes stay queued for the next sync.

PBKDF2 runs in a local native module (`modules/withink-crypto`, Kotlin/CommonCrypto)
on a background thread. The module self-tests against a known-answer vector
before it is trusted; Expo Go and any self-test failure fall back to the hidden
WebView's WebCrypto bridge and then to an audited pure-JS implementation.
AES-GCM and HKDF use `@noble` primitives validated against the web golden
vectors. The master key and 15-minute unlock token stay in memory only. The
editor is plain text and regenerates TipTap-compatible HTML/JSON on save.

Checks: `pnpm --filter @withink/mobile test` also covers the SQLite adapter, the
cache/sync flow and the native KDF wrapper (31 tests). Remaining slices: rich
editor and the Phase 2 account endpoints; see
`internal-docs/MOBILE_LAUNCH_PLAN.md`.
