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

### Troubleshooting the Android build

- **`ninja: manifest 'build.ninja' still dirty after 100 tries`** — pnpm's
  hashed module paths can exceed Windows' 260-character limit for the Ninja
  bundled with CMake 3.22. Use Ninja 1.12+ (long-path support) in
  `cmake/3.22.1/bin/ninja.exe`, or move the checkout to a shorter path.
- **Kotlin/clang runs out of memory** — build with `--no-daemon
  --max-workers=1`, set `CMAKE_BUILD_PARALLEL_LEVEL=1`, and keep
  `org.gradle.jvmargs` near 1.5 GB on a 16 GB machine. If the app's C++ still
  dies, run `ninja` directly in `app/.cxx/Debug/<hash>/arm64-v8a` without
  Gradle, then re-run `assembleDebug` to package.
- **Port 8081 already in use** (e.g. by Tailscale) — run Metro with
  `--port 8082` and `adb reverse tcp:8081 tcp:8082`, so the device still
  reaches the bundle on its expected port.

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
vectors. The master key and 15-minute unlock token stay in memory only.

The entry body is the shared TipTap editor running in a bundled, offline
WebView (`@withink/editor`). The document is generated from the package's
bridge entry and committed as
`src/lib/editor-webview.generated.ts`; after changing an extension or the
bridge, regenerate it and commit the result:

```bash
pnpm --filter @withink/editor build:webview
pnpm --filter @withink/editor test   # fails if the committed document drifts
```

Checks: `pnpm --filter @withink/mobile test` also covers the SQLite adapter, the
cache/sync flow and the native KDF wrapper (31 tests). Remaining slices:
editor chrome parity (links/media, mood/notebook), iOS verification, and the
journal screens; see `internal-docs/MOBILE_LAUNCH_PLAN.md`.
