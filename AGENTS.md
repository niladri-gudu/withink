# AGENTS.md

Turborepo + pnpm monorepo for Withink, a private journaling app (Next.js 16, React 19).

## Canonical docs (read before coding)

`internal-docs/` is the source of truth. `internal-docs/CLAUDE.md` is the full engineering guide (architecture rules, design rules, security, Definition of Done). Read in order: `PROJECT_STATE.md` → `IMPLEMENTATION_PLAN.md` → `ARCHITECTURE.md` → `DESIGN_SYSTEM.md` → `PRD.md`. Update `PROJECT_STATE.md` after meaningful milestones.

## Layout

- `apps/app/` — dashboard at `app.withink.me`. All auth, DB, services, features.
- `apps/docs/` — public landing/policy site at `withink.me`. Dev port **3001**.
- `packages/` — `@withink/{ui,theme,tokens,utils,config,eslint-config,typescript-config}`. Consumed as **source** via `transpilePackages` (no build step). `@withink/ui` exposes per-component subpaths (`@withink/ui/button`, etc.).
- Data layer (Mongoose models, repositories, storage, email, auth) is **app-local**, not in `packages/`.

## Commands

```sh
pnpm dev                # turbo: both apps (docs on :3001)
pnpm dev:app            # app only (next dev --webpack)
pnpm lint               # turbo run lint
pnpm typecheck          # turbo run typecheck
pnpm build              # production build
pnpm format             # prettier --write .   (note: *.md ignored)
```

- Root scripts run turbo; use `pnpm --filter @withink/app <script>` for one package.
- `pnpm test` (= `turbo run test`) **builds first** (`dependsOn: ["^build"]`). For a fast focused check run vitest directly:
  `pnpm --filter @withink/app vitest run src/features/journal/services/journal-service.test.ts`
  or `pnpm --filter @withink/app vitest` for watch.
- Build runs through `apps/app/scripts/build.mjs` (sets V8 heap flags, caps workers) — don't replace it with a bare `next build`.
- Verify a feature with `typecheck` → `lint` → focused `vitest` → `build` before finishing.

## Env & secrets

- Server env is zod-validated lazily in `apps/app/src/config/env.ts` (`server-only`; first runtime read throws if missing). `NEXT_PUBLIC_R2_PUBLIC_URL` is required at **build** time.
- Templates: `apps/app/.env.development.example`, `apps/app/.env.production.example`. Copy to `.env.local` for local dev.
- `IS_PROD=false` selects the `withink_dev` DB and local-scope cookies. **Never** set `IS_PROD=true` locally — it hits the prod DB and prod cookies.
- Node is pinned (`.nvmrc` 24.15.0, engines `>=24.11.1 <25`, pnpm 10.27.0). On Windows, do not casually bump Node: newer versions have a c-ares regression that breaks `mongodb+srv://` SRV resolution (see `.npmrc`).
- Tests mock `@/config/env` in `vitest.setup.ts`, so tests run with no real env / no DB.

## App conventions

- `@/*` → `apps/app/src/*`. Feature-first layout: `src/features/{journal,media,auth,settings,...}` owns its components, actions, hooks, types, validation, repositories, services, tests. `src/app` is routing only.
- Server-first: Server Components by default, Server Actions over API routes (API only for webhooks/uploads). Repository pattern — features never hit Mongoose directly. Validate with zod, verify ownership/authorization server-side on every action.
- Tailwind v4: design tokens come from `@withink/tokens/theme.css`; `apps/app/src/app/globals.css` uses `@source` to pull in workspace package sources. Never hardcode colors/spacing/typography — use tokens (see `DESIGN_SYSTEM.md`).
- Animations use `motion` — never framer-motion or GSAP.
- Import order is enforced by `@ianvs/prettier-plugin-sort-imports` (root `.prettierrc.json`); keep imports in the configured groups. Prettier ignores `*.md`.
- `next.config.ts` enables React Compiler, Cache Components (PPR), and typedRoutes — write code accordingly (typed route strings, `use cache`).
