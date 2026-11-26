# @withink/mobile

Expo (React Native) client for Withink. It shares the journal domain, wire
contracts, and HTTP client with the web app:

- `@withink/core` — dates, insights, flashbacks, plans, sync planning
- `@withink/contracts` — zod wire schemas and the API error envelope
- `@withink/api-client` — typed sync client (bearer auth on native)

Authentication uses Better Auth's Expo client: the session lives in SecureStore
and the derived session token authorizes `/api/sync/*`.

## Run on Android over USB

```bash
# from the repo root
adb reverse tcp:3000 tcp:3000   # Next.js API
adb reverse tcp:8081 tcp:8081   # Metro

pnpm --filter @withink/app dev                              # terminal 1
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

Sign-up/sign-in, bearer session, and the sync manifest (entry dates). Unlock,
decryption, the editor, and local SQLite storage are the next slices; see
`internal-docs/MOBILE_LAUNCH_PLAN.md`.
