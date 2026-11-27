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

Sign-up/sign-in, forgot/reset password, encrypted unlock (password or
biometric), and a local-first journal that mirrors the web:

- **Today** — greeting, yesterday banner, today's page, streak, recent
  reflections and a flashback card.
- **Entries** — archive with search, mood/time/notebook filters, a mood
  calendar, pagination, delete and move-to-notebook.
- **Insights** — streak, 365-day heatmap, mood and word charts, activity
  summaries and a monthly overview, all computed from the decrypted local
  timeline.
- **Flashbacks** — anniversary-first selection with device-local history.
- **Notebooks** — create/rename/delete/set-default/move with plan limits.
- **Media** — gallery/list with search and sort, lightbox, storage quota,
  quota-aware uploads and reference-scrubbing deletes.
- **Settings** — profile, shared appearance (palettes, fonts, accents, paper
  scale), sync & data (cache size, rebuild, export via the share sheet),
  reminders, lock/encryption/biometrics, sign-in password, legal links and
  account deletion.

Pages are pulled, decrypted and persisted to SQLite; the editor stores
encrypted documents, writes a plaintext sync index, queues an encrypted
pending write, and flushes it to `/api/sync/push`. Failed pushes stay queued;
foregrounding the app syncs again. The 15-minute unlock token is renewed from
the in-memory master key while the diary is open.

PBKDF2 runs in a local native module (`modules/withink-crypto`, Kotlin/CommonCrypto)
on a background thread. The module self-tests against a known-answer vector
before it is trusted; Expo Go and any self-test failure fall back to the hidden
WebView's WebCrypto bridge and then to an audited pure-JS implementation.
AES-GCM and HKDF use `@noble` primitives validated against the web golden
vectors. The master key and unlock token stay in memory; biometric unlock
stores the key in SecureStore behind an OS authentication prompt.

The entry body is the shared TipTap editor running in a bundled, offline
WebView (`@withink/editor`), with a formatting sheet, link dialog, image
upload, mood and notebook chrome. After changing an extension or the bridge,
regenerate and commit the document:

```bash
pnpm --filter @withink/editor build:webview
pnpm --filter @withink/editor test   # fails if the committed document drifts
```

Adding native modules (local authentication, image picker, sharing) requires a
fresh development build: `npx expo run:android`. The build bakes the dev-server
port; if Metro runs on 8082, forward it as well:

```bash
adb reverse tcp:8082 tcp:8082
npx expo start --port 8082
```

Checks: `pnpm --filter @withink/mobile test` (54 tests), plus `typecheck` and
`lint`. Private images render inline in the editor: `media-images.ts`
downloads each referenced URL with the session headers, shrinks it and hands
the WebView a data URI, while the stored document keeps the canonical URL
(the editor bundle also polyfills built-ins for old System WebViews). Known
gaps: iOS verification, native push token registration (needs EAS/FCM
credentials), letters/feedback UI, archive import, and enabling
zero-knowledge from the device.
