# @withink/mobile

Expo (React Native) client for Withink. It shares the journal domain, wire
contracts, and HTTP client with the web app:

- `@withink/core` — dates, insights, flashbacks, plans, sync planning
- `@withink/contracts` — zod wire schemas and the API error envelope
- `@withink/api-client` — typed sync client (bearer auth on native)

Authentication uses Better Auth's Expo client: the session lives in SecureStore
and the derived session token authorizes `/api/sync/*`.

## Run on Android (USB device or emulator)

```bash
# from the repo root (works for a USB device and an emulator
# such as Pixel_4; `adb devices` should list one target)
adb reverse tcp:3000 tcp:3000   # Next.js API
adb reverse tcp:8081 tcp:8081   # Metro

pnpm --filter @withink/app dev                              # terminal 1
pnpm --filter @withink/mobile start -- --localhost --android # terminal 2
```

`--android` installs Expo Go on the emulator when it is missing.

`EXPO_PUBLIC_API_URL` defaults to `http://localhost:3000`; override it for a
LAN or production origin:

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

PBKDF2 runs through a hidden WebView's native WebCrypto (with an audited pure-JS
fallback); AES-GCM and HKDF use `@noble` primitives validated against the web
golden vectors. The master key and 15-minute unlock token stay in memory only.
The editor is plain text and regenerates TipTap-compatible HTML/JSON on save.

Checks: `pnpm --filter @withink/mobile test` also covers the SQLite adapter and
the cache/sync flow (25 tests). Remaining slices: rich editor, native crypto
module for a development build, and the Phase 2 account endpoints; see
`internal-docs/MOBILE_LAUNCH_PLAN.md`.
