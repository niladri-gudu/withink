# Withink — Mobile-First Redesign Prompt Kit

Created: 2026-08-23

Paste-ready prompts for redesigning Withink to be **phone-first** while keeping the established warm paper identity (manila desk / ledger paper / sepia ink / old-paper gold, Alegreya + Caveat — see root `DESIGN.md` and `internal-docs/DESIGN_SYSTEM.md`).

## Decisions locked before writing these prompts

1. **Identity stays.** This is refinement of an established world (impeccable new-work §1 "Established world: inherit it"), NOT a replacement visual world. Never run impeccable's concept-seed / direction-roll flow for this work.
2. **Scope = the dashboard app** (`apps/app`) first. Marketing site (`apps/docs`) is Phase 5, included below for later.
3. **Phone navigation becomes a bottom tab bar**: Today · Entries · Insights · More. Desktop keeps the existing folio margin rail.
4. Baseline viewport **375×812**; desktop secondary but must not regress.

## How to use

- Work in this repo on a redesign branch. Paste ONE prompt into a fresh chat, let it finish, verify, commit, then paste the next prompt into another fresh chat.
- Every prompt assumes the chat runs inside this repo (AGENTS.md auto-loads) and restates critical context anyway.
- Handy standalone impeccable commands usable anytime: `$adapt`, `$critique`, `$audit`, `$polish`, `$harden`, `$clarify`, `$live`.
- Test account for manual verification: `test@test.com` / `test@123` (diary password: `test@test`).
- Windows + pnpm. Dev app: `pnpm dev:app`. NEVER set `IS_PROD=true` locally. Do NOT bump Node (c-ares regression breaks `mongodb+srv://`).

---

## PROMPT 1 — Foundation: Mobile IA, App Shell, Primitives

```text
# Withink — Mobile-First Redesign · Phase 1/4: Foundation (IA, App Shell, Primitives)

Repo: D:\code\saas\withink.me — Turborepo + pnpm monorepo for Withink, a private ZERO-KNOWLEDGE encrypted diary (Next.js 16, React 19, Tailwind v4, Tiptap v3, motion, Better Auth, MongoDB). Before coding, read: AGENTS.md → internal-docs/PROJECT_STATE.md (esp. Recent Decisions 2026-08-13 → 2026-08-23) → internal-docs/DESIGN_SYSTEM.md → PRODUCT.md → DESIGN.md (repo root).

## Mission
Redesign the dashboard app (apps/app, served at app.withink.me) to be PHONE-FIRST — users journal mostly on phones. This is Phase 1 of 4. Scope discipline: foundation only. Phase 2 = editor + dashboard, Phase 3 = browse surfaces (entries/insights/media/settings/auth), Phase 4 = polish/audit/docs. Do not pull future-phase work forward.

## Locked decisions (do not revisit)
1. VISUAL IDENTITY STAYS: the warm paper world — manila desk / ledger paper / sepia ink / old-paper-gold accent, Alegreya + Caveat, hairline borders over shadows, 0.75rem corners, 100–250ms motion, calm-over-productivity. Do NOT run impeccable's new-world / concept-seed replacement flow. This is refinement of an ESTABLISHED world (impeccable new-work.md §1: "Established world: inherit it").
2. Phone navigation becomes a native-style BOTTOM TAB BAR: Today · Entries · Insights · More. Desktop keeps the existing left folio margin rail unchanged.
3. Baseline viewport 375×812; every decision optimizes thumb reach + one-handed use; desktop secondary but must not regress.

## Setup
1. Load the impeccable skill, then run ONCE: node .agents/skills/impeccable/scripts/context.mjs
2. Load .agents/skills/impeccable/reference/adapt.md (responsive) and reference/operate.md (app surfaces); load reference/craft-floor.md immediately before editing UI.

## Verified current-state facts
- Shell: apps/app/src/features/app-shell/components/{app-shell,sidebar,header,page-header}.tsx. Desktop = numbered folio rail ("01 Today … 07 Feedback", hidden md:flex, animates 264↔76px via CSS transition-[width], exposes --sidebar-width; collapse persisted in localStorage). Mobile = md:hidden sticky h-14 Header (hamburger h-11 w-11 + wordmark + ThemeToggle) opening a w-72 max-w-xs slide-in drawer defined inside sidebar.tsx (~line 442), focus-trapped, z-[60]. NO bottom nav exists anywhere.
- Content wrapper: max-w-4xl px-6 py-8 md:py-12 lg:px-8; skip-link targets <main tabIndex={-1}>; entire shell set inert while diary-lock gated; gate screens share src/components/gate-layout.tsx at z-[9999].
- Tokens: packages/tokens/theme.css = @theme mapping + typography @utility classes (text-display/hero/h1/h2/h3/title/subtitle/body-large/body/body-small/caption/label/helper — fixed sizes, NO fluid scaling), duration vars (100/150/200/250ms), --radius 0.75rem. apps/app/src/app/globals.css overrides nearly every value (WCAG-hardened --accent/--ring oklch(0.5 0.105 75)), declares --withink-paper-scale (html font-size = calc(16px * scale) → whole-UI zoom), .ledger-rules ruled-paper background, ~250 lines of .tiptap prose styles. Both apps' globals.css override the shared palette — treat apps/app/src/app/globals.css as app truth.
- packages/ui exports ONLY: Button (cva), Card family, Input, Textarea, Skeleton, Tooltip, ThemeToggle (h-11 w-11 md:h-9 md:w-9), BrandLoader, useMounted. There is NO Dialog/Sheet/Drawer primitive — every overlay app-wide is bespoke (fixed inset-0 + motion/animate-in + src/hooks/use-focus-trap.ts). The unified `radix-ui` ^1.4.3 package IS installed (plus legacy granular @radix-ui/react-slot + tooltip). sonner Toaster is mounted top-right globally in root layout.
- Icon-button sizes are chaotic app-wide (h-7, h-8, h-9, h-10, h-11 with no rule); the running-head eyebrow pattern (serif ~11px tracking-[0.16em] uppercase) is copy-pasted in dozens of files.
- Direction contract comment lives in apps/app/src/app/layout.tsx ("The Annotated Codex", seed be2a53bd) — keep and amend, never remove.

## Work
1. Bottom tab bar (new client component, e.g. features/app-shell/components/tab-bar.tsx, rendered by app-shell.tsx, md:hidden):
   - Items: Today (/), Entries (/entries), Insights (/insights), More (opens sheet). Typed-route Links (typedRoutes is ON), usePathname active state (map /entries/[date] → Entries active).
   - Active language matches the rail: tracked uppercase micro-label + icon + gold tick/fill. Icons: lucide only.
   - "More" opens a bottom SHEET (see #2): Media, Flashbacks, Feedback, Settings, ThemeToggle, avatar/sign-out.
   - HIDDEN on the editor route /entries/[date] (writing is fullscreen, chrome-minimal) and while lock gates are up. Backdrop-blur bg-card/90 + hairline border-t; padding respects env(safe-area-inset-bottom); ≥44px hit targets; icon + label stacked.
   - Slim the mobile Header down to wordmark + ThemeToggle once the tab bar owns navigation.
2. New primitives in packages/ui (source-consumed workspace pkg — follow its per-component subpath export pattern in package.json):
   - sheet: built on unified radix-ui Dialog, side variant (bottom on mobile / side on desktop via cva), rounded-t-2xl, bg-card + border hairline, overlay blur, focus trap + Escape handled by Radix, safe-area padding.
   - dialog: same base, centered card, shadow allowed (overlay elevation), sizes sm/md/lg.
   - icon-button: cva sizes mapping to ≥44px (h-11 w-11) on mobile, h-9 w-9 md+, REQUIRED aria-label prop. Establish it now; mass migration happens later phases.
   - Add @utility text-running-head (and text-hand) to packages/tokens/theme.css; don't rewrite existing usages yet.
3. Z-index contract: define + document one scale (content < sticky header < editor overlays < tab bar/sheet/drawer z-[60] < gates z-[9999]) as a commented map in globals.css; make all NEW pieces comply.
4. sonner Toaster: bottom-center on mobile offset above the tab bar + safe area; keep top-right on desktop.
5. Fluid type: convert text-display/hero/h1/h2/h3 to clamp() fluid sizes in packages/tokens/theme.css — desktop rendered size ≈ current px, phones scale down gracefully. Verify .ledger-rules rhythm still aligns at new sizes.
6. Amend the direction-contract comment in apps/app/src/app/layout.tsx: append one line recording the mobile-first revision (bottom tab bar, phone-first hierarchy) — identity unchanged.
7. Write the shell surface brief:
   node .agents/skills/impeccable/scripts/surface-brief.mjs write apps/app/src/features/app-shell/components/app-shell.tsx <body-file>
   (scope/mode Operate, audience job, direction = folio rail + tab bar, memorable moment, unresolved decisions.)

## Never break
- Zero-knowledge flows: EncryptionProvider, unlock-proof binding, SSR lock gate ((app)/layout.tsx renders LockedContentPlaceholder when locked), local-first autosave + JournalSyncService. UI-only changes; NO server-action signature changes.
- Next 16 Cache Components/PPR, React Compiler, typedRoutes; Server Components by default.
- motion (never framer-motion/GSAP); semantic tokens only (zero hardcoded colors/spacing); lucide icons only (moods are never emoji); prefers-reduced-motion honored.
- A11y: every overlay focus-trapped + Escape-closable, aria-labels, visible focus rings.

## Environment
Windows + pnpm. Dev: pnpm dev:app. NEVER set IS_PROD=true locally. Do NOT bump Node (c-ares regression breaks mongodb+srv://). Manual test account: test@test.com / test@123 (diary password: test@test).

## Definition of Done
- pnpm --filter @withink/app exec tsc --noEmit → clean; pnpm --filter @withink/app lint → 0 errors; pnpm --filter @withink/app vitest run (if shell tests touched) green; pnpm build (root — goes through apps/app/scripts/build.mjs; never bypass it) succeeds.
- Batched browser pass: mobile 375×812 — tab bar on all main routes, More sheet opens/closes/traps focus, editor route hides it, gates unaffected, NO horizontal overflow on any route; desktop 1440 — rail + everything unchanged.
- node .agents/skills/impeccable/scripts/detect.mjs --json on changed files → mechanical findings fixed.
- No TODO comments. PROJECT_STATE.md gets a dated entry describing this phase.
Stop at Phase 1 scope. Report: what changed, what you verified, deferred items for Phases 2–4.
```

---

## PROMPT 2 — The Writing Experience (Dashboard + Editor)

```text
# Withink — Mobile-First Redesign · Phase 2/4: The Writing Experience (Dashboard + Editor)

Repo: D:\code\saas\withink.me — private zero-knowledge encrypted diary (Next.js 16, React 19, Tailwind v4, Tiptap v3, motion). Read AGENTS.md → internal-docs/PROJECT_STATE.md (Recent Decisions, esp. the 2026-08-23 autosave/data-loss entries) → internal-docs/DESIGN_SYSTEM.md → PRODUCT.md/DESIGN.md → .agents/skills/impeccable reference files. Then read the Phase-1 PROJECT_STATE entry and .impeccable/surfaces/ briefs: Phase 1 already landed the mobile foundation (bottom tab bar Today·Entries·Insights·More, @withink/ui sheet/dialog/icon-button primitives, text-running-head utility, z-index contract, fluid display type).

Run ONCE: node .agents/skills/impeccable/scripts/context.mjs — then load reference/operate.md + reference/craft-floor.md before editing.

## Locked decisions
Paper identity stays (manila/ink/gold, Alegreya+Caveat). Phone-first, 375px baseline. Editor route = fullscreen chrome-minimal (tab bar hidden). This phase touches ONLY the dashboard + journal editor surfaces.

## Verified current-state facts
- Editor: src/features/journal/components/journal-editor-shell.tsx renders its OWN min-h-screen + max-w-3xl + fixed overlays INSIDE the shell's max-w-4xl px-6 py-8 wrapper → double padding, competing fixed layers (its own scroll-progress bar, fading gradient, ledger-rules, SaveIndicator pill at right-6 bottom-6; z-20/30/40/50 vs drawer z-[60]).
- Toolbar: journal/components/editor/editor-toolbar.tsx — floating pill fixed to viewport bottom-center, ~20 buttons in ONE overflow-x-auto strip (undo/redo, H1–H3, B/I/U/S/highlight, lists, quote/code, link, image, clear, zen, word-count at far end). Buttons h-10 w-10 touch-manipulation + navigator.vibrate(10). Repositions above the mobile keyboard via visualViewport resize/scroll rAF + injected scroll-padding (journal-editor-shell.tsx ~241–302) — KEEP this mechanism. Link insertion uses window.prompt (terrible on mobile).
- Save pipeline (DO NOT ALTER SEMANTICS — presentation only): hooks/use-auto-save.ts (1500ms debounce; encrypt → IndexedDB document_cache/metadata_cache → sync queue → instant "saved"; retry/backoff; stale-date flush), services/journal-sync-service.ts (single-flight push/pull), use-sync-status → save-indicator.tsx states ("Saved · Synced" / "Saved locally · Syncing" / "Save failed" / "Session locked" / "Working offline"). Tiptap snapshot debounced 400ms, flushed on blur/pagehide/unmount.
- MoodSelector: 5 motion-animated mood radio icons (lucide, never emoji). Title input text-4xl sm:text-5xl. Zen mode dims chrome + pb-[30vh], typewriter clicks + ambient audio (src/lib/zen-audio.ts). Image flow: compress (lib/image-compressor.ts, 1600px WebP) → presigned R2 PUT → base64 fallback; paste/drop handlers in tiptap-editor.tsx.
- Dashboard: src/app/(app)/page.tsx builds its header INLINE (not PageHeader) + streams DashboardHero (yesterday-missed banner, Today card md:col-span-2, streak "margin note") + DashboardLowerGrid (FlashbackCard + RecentReflectionsList).

## Work
1. De-nest the editor route: /entries/[date] becomes a TRUE fullscreen writing surface — escape the shell content padding via an explicit shell API (e.g. a ShellFullscreen/conditional wrapper in app-shell.tsx so intent is documented, not negative-margin hacks). One scroll container, ONE owner of fixed overlays, one scroll-progress hairline max; resolve the z-layer pileup.
2. Rebuild the toolbar around thumbs (mobile):
   - Primary row (always visible): undo/redo · B/I/U · bullet list · task toggle · "+" (formatting sheet) · word-count chip trailing.
   - "+" opens the Phase-1 Sheet: H1–H3, U/S/highlight, ordered+task lists, quote, code, clear formatting, LINK, IMAGE.
   - Link → small Dialog (URL input, Insert/Remove) replacing window.prompt. Image → existing picker/compress flow launched from the sheet.
   - Keep h-10 w-10 targets, haptics, and visualViewport keyboard avoidance; toolbar clears the tab-bar band budget even though the tab bar is hidden here.
3. Save state moves INTO the editor's top header row on mobile (quiet inline text + gold dot: "Saving… / Saved · Synced / Saved locally · Syncing / Save failed") — the bottom-right pill competes with toolbar + keyboard; keep the pill on sm+ only. Preserve every existing state.
4. MoodSelector: ≥44px targets, sits comfortably near the title above the fold.
5. Zen mode on phones: hide ALL floating chrome (toolbar, headers); tap-to-reveal toolbar; audio + motion stay reduced-motion/opt-in as today.
6. Dashboard phone-first: reuse PageHeader (delete the inline header); order = Today card (dominant; primary CTA "Write today's entry", thumb-sized) → streak margin note → flashback → recent reflections. Single column on phones; preserve existing md: grids on desktop. Yesterday-missed banner stays calm + dismissible.
7. Update every related skeleton (loading.tsx, PageLoadingHeader/PageLoadingShell) to mirror the new layouts.
8. Write/update the surface brief for the journal feature (surface-brief.mjs write …) capturing these decisions.

## Never break
Autosave/local-first sync semantics; offline queue convergence; cross-date navigation pending-edit flush (prevDataRef); ZK ciphertext never flashing raw in server HTML (encrypted-flag skeletons); SSR lock gate; typedRoutes/PPR/React Compiler; motion-not-framer; tokens-not-hardcoded-values; a11y (focus trap, aria, reduced motion).

## Environment
Windows + pnpm. pnpm dev:app. NEVER IS_PROD=true locally. Don't bump Node. Test account: test@test.com / test@123 (diary password: test@test).

## Definition of Done
- tsc --noEmit clean; lint 0 errors; pnpm --filter @withink/app vitest run green (journal service/hook tests especially); pnpm build clean.
- Browser pass (batched, mobile 375×812 + desktop 1440): typing latency feels instant; toolbar usable one-handed above keyboard (verify with DevTools touch + simulated visual viewport); save indicator states all reachable (offline mode → type → online → syncs); cross-date nav loses nothing; a 5000-word entry + image gallery scrolls smoothly; zen mode + mood selector + link dialog all work by touch; dashboard single-column reads calmly; skeletons match.
- detect.mjs --json clean on changed files. No TODOs. PROJECT_STATE.md dated entry added.
Stop at Phase 2 scope. Report changes, verification evidence, deferred items.
```

---

## PROMPT 3 — Browse Surfaces (Entries, Insights, Media, Flashbacks, Settings, Auth/Gates)

```text
# Withink — Mobile-First Redesign · Phase 3/4: Browse Surfaces

Repo: D:\code\saas\withink.me — private zero-knowledge encrypted diary (Next.js 16, React 19, Tailwind v4, Tiptap v3, motion). Read AGENTS.md → internal-docs/PROJECT_STATE.md (Recent Decisions) → internal-docs/DESIGN_SYSTEM.md → PRODUCT.md/DESIGN.md. Then the PROJECT_STATE entries + .impeccable/surfaces/ briefs from Phases 1–2 (landed: bottom tab bar + More sheet, sheet/dialog/icon-button primitives, fullscreen editor + thumb toolbar + header-row save state, phone-first dashboard, text-running-head utility, z-index contract).

Run ONCE: node .agents/skills/impeccable/scripts/context.mjs — then load reference/operate.md + reference/craft-floor.md before editing.

## Locked decisions
Paper identity stays. Phone-first 375px baseline. ONE app-wide delete/destructive convention, decided here: visible kebab (⋮) menu button → confirm Dialog. No hover-reveal anything anywhere.

## Verified current-state facts
- Entries: (app)/entries/page.tsx → EntriesPageShell lg:grid-cols-3 (sticky calendar+stats col, timeline col). EntriesCalendar = mood-colored month grid, h-8 nav arrows. EntriesTimeline = search input + native <select> filters + pagination; delete confirm uses tiny h-7 Yes/No buttons; rows use sm:opacity-0 hover-reveal delete (inverted convention on touch).
- Insights: InsightsDashboard stat passage grid-cols-2 md:grid-cols-4; lazy InsightsCharts chunk contains CalendarHeatmap (365-day GitHub-style inside min-w-[760px] overflow-x-auto no-scrollbar; tooltips are group-hover ONLY — unreachable on touch), MoodHistoryCharts (bars + SVG trend), WordCountCharts, ActivitySummaries, MonthlyOverview (own native selects + mood distribution sm:grid-cols-5). Data comes from a Redis-cached server action invalidated on writes — DO NOT touch the data layer.
- Media: MediaGallery (storage meter, search/sort selects, grid-cols-2 sm:3 md:4, grid⇄list toggle) + MediaLightbox (fullscreen viewer, prev/next, delete, linked-entry lookup). Grid "View Memory" overlay appears on group-hover only — invisible to touch until tapped.
- Flashbacks: FlashbackView full-page memory reader + refresh action; DashboardFlashbackCard already done in Phase 2.
- Settings: single ~1,600-line settings-shell.tsx — Profile, Appearance (theme cards), Paper feel (scale slider + PPI/card calibrators), Security, ZK Encryption modals, Diary Lock (toggle/PIN setup/change/auto-lock/tab-switch), Connected accounts, Export (DataExportCard, lazy JSZip), Danger zone (delete-account modal). Most modals are bespoke fixed overlays + useFocusTrap.
- Auth: (auth)/login|register|forgot-password|reset-password|verified — centered max-w-md cards on ruled ledger paper. Gates: LockScreen (PIN keypad h-16 w-16 keys), MandatoryDiarySetup, DiaryPasswordUnlockScreen, LockSetupOnboarding — all inside src/components/gate-layout.tsx (z-[9999], scrollable).
- Feedback: FeedbackForm (category cards, screenshot upload) under PageHeader.

## Work
1. Entries phone-first: single column. Calendar → compact month-pager strip (chevrons ≥44px, selected day opens /entries/[date]); metrics collapse to a one-line folio row; timeline cards full-width with a clean meta row; filters move into a filter Sheet (chip row inside); search sticky under the header; adopt the kebab→confirm-Dialog delete convention.
2. Insights for touch: stats 2-up grid on phones; REPLACE the 760px-wide heatmap with a paged/tappable design (month-by-month pager OR quartered horizontal pages with dots — no pinch, no min-width); day detail via tap → popover/dialog; charts stack full-width with generous spacing; keep the lazy chunk split.
3. Media: 2-col default grid on phones; captions/status ALWAYS visible (kill hover-only overlay); lightbox: swipe left/right navigation, tap-to-dismiss affordance, delete behind confirm Dialog; compact storage meter row.
4. Flashbacks: tune measure + spacing for 375px; refresh reachable; keep the immersive reader feel.
5. Settings: restructure into clearly grouped sections — Profile / Appearance & Paper feel / Privacy & Security (ZK + Diary Lock together) / Your data (export + connected accounts) / Danger zone visually separated last. On mobile prefer collapsible groups or sub-Sheets over one endless scroll. Migrate ALL bespoke modals (PIN setup/change, ZK enable/disable, delete account) onto the Phase-1 Dialog/Sheet primitives, preserving focus-trap/Escape/inert semantics. Forms stay react-hook-form + zod.
6. Auth + gates: every screen fits and scrolls correctly at 375×667; PIN keypad ergonomic (large keys, haptics, error shake); correct autocomplete/otp attributes; heading hierarchy stays h1-normalized; GateLayout untouched structurally unless something clips.
7. Feedback: single-column form, categories as 44px chips/cards.
8. Pick ONE pattern for selects (tokenized native <select> is fine and mobile-native) and apply it everywhere (timeline, media, monthly overview, lock timeout).
9. Adopt the icon-button primitive at former ad-hoc h-7/h-8 sites in these surfaces. Write/update surface briefs for entries, insights, media, settings.

## Never break
SSR lock gate + gate screens (locked sessions must never stream content); media ownership/deep-reference scrubbing (UI only); insights cache keys; export ZIP flow (lazy JSZip import stays lazy); ZK ciphertext skeletons; PPR/typedRoutes/React Compiler; motion-only animation; semantic tokens; a11y everywhere.

## Environment
Windows + pnpm. pnpm dev:app. NEVER IS_PROD=true. Don't bump Node. Test account: test@test.com / test@123 (diary password: test@test).

## Definition of Done
- tsc clean; lint 0 errors; vitest green; pnpm build clean.
- Batched browser pass (375×812 + 1440): entries calendar pager + filters sheet + kebab delete; insights heatmap fully usable by touch (no dead tooltips); media swipe lightbox + always-visible captions; settings groups + all modals on primitives; auth/gates fit small phones; feedback form clean; NO horizontal overflow on any route; desktop unchanged-or-better.
- detect.mjs --json clean on changed files. No TODOs. PROJECT_STATE.md dated entry.
Stop at Phase 3 scope. Report changes, verification evidence, deferred items.
```

---

## PROMPT 4 — Finish: Consistency, Polish, Audit, Documentation

```text
# Withink — Mobile-First Redesign · Phase 4/4: Finish (Consistency, Polish, Audit, Docs)

Repo: D:\code\saas\withink.me — private zero-knowledge encrypted diary. Phases 1–3 landed the full mobile-first redesign of apps/app (tab bar + More sheet, sheet/dialog/icon-button primitives, fullscreen editor + thumb toolbar + header save state, phone-first dashboard, reworked entries/insights/media/settings/auth/feedback). Read AGENTS.md → internal-docs/PROJECT_STATE.md (all phase entries) → DESIGN_SYSTEM.md → PRODUCT.md → DESIGN.md.

Run ONCE: node .agents/skills/impeccable/scripts/context.mjs. Then load impeccable references: polish.md, audit.md, harden.md, and craft-floor.md before any edits.

## Work (bounded passes — per the skill: one batched inspection round → one batched fix round → at most one confirm round → STOP polishing)
1. Consistency sweep across EVERY route (incl. auth + gates): PageHeader used everywhere (no inline headers); one spacing rhythm; icon-button primitive adopted wherever touch targets matter; empty/loading/error states present and skeleton-matched on every surface; toasts consistent; the running-head utility replaces remaining copy-pasted eyebrows.
2. Accessibility audit: keyboard-only walkthrough of every flow (tab bar, More sheet, editor toolbar via keyboard, sheets/dialogs with focus restore, lightbox, PIN pad); aria-labels on all icon-only controls; focus-visible rings; reduced-motion honored; contrast spot-checks against the WCAG-hardened tokens.
3. Responsive audit: 320 / 375 / 414 / 768 / 1024 / 1440 — zero accidental horizontal scroll, gates never clip on short viewports, safe-area insets respected, landscape-phone editor usable.
4. Performance: pnpm build route report vs baseline (21 routes; main routes PPR ◐); editor bundle not larger; gate screens still statically imported; jszip still lazy; images via next/image. If Chrome DevTools MCP is available, run a MOBILE Lighthouse/CWV check on /, /entries, /entries/[date] and record results.
5. Run node .agents/skills/impeccable/scripts/detect.mjs --json on all changed files; fix mechanical findings. Run impeccable critique on the two flagship surfaces (editor + dashboard); triage honestly within the bounded pass ceiling.
6. Documentation of record: REWRITE DESIGN.md's app sections from the BUILT world (frontmatter colors/typography/rounded/spacing/components as actually shipped — ground truth over intention); finalize all .impeccable/surfaces/ briefs; write the PROJECT_STATE.md milestone entry summarizing all four phases + a deferred-debt list + a manual regression script (sign-in → unlock → write/autosave offline→online → search → flashbacks → insights → media upload/delete → settings toggles → export → lock → logout).
7. Final battery: pnpm typecheck && pnpm lint && pnpm --filter @withink/app vitest run && pnpm build (both apps) — all green; pnpm format:check clean.

## Never break
All Phase 1–3 invariants: zero-knowledge flows, SSR lock gate, autosave/sync semantics, PPR/typedRoutes/React Compiler, motion-only, tokens-only, a11y.

## Environment
Windows + pnpm. pnpm dev:app. NEVER IS_PROD=true. Don't bump Node. Test account: test@test.com / test@123 (diary password: test@test).

## Report
Final summary of the whole redesign: what shipped per phase, verification evidence (screenshots described, CWV numbers), deferred items, and recommended next pass (marketing site at apps/docs deserves the same phone-first treatment — see REDESIGN_PROMPTS.md Phase 5).
```

---

## PROMPT 5 — Marketing Site (apps/docs) Phone-First Pass

Run AFTER Phases 1–4 (it reuses the Sheet/Dialog/icon-button primitives added in Phase 1).

```text
# Withink — Mobile-First Redesign · Phase 5: Public Site (apps/docs)

Repo: D:\code\saas\withink.me — Turborepo monorepo. Target: apps/docs, the public marketing/policy site at withink.me (dev port 3001 via pnpm dev). Identity: "The Field Ledger, kept as a diary" per root DESIGN.md (manila kraft ground, iron-gall sepia ink, old-paper-gold accent ≤5%, Alegreya printed serif + Caveat hand annotations ONLY, hairlines over shadows, 0.75rem corners, 100–250ms motion). Read AGENTS.md → internal-docs/PROJECT_STATE.md → PRODUCT.md → DESIGN.md (the docs-surface design system) first. This is refinement of an ESTABLISHED world — do NOT run impeccable's new-world/concept-seed flow.

Run ONCE: node .agents/skills/impeccable/scripts/context.mjs — then load .agents/skills/impeccable/reference/adapt.md + reference/operate.md (and reference/craft-floor.md right before editing).

## Mission
Make withink.me excellent on phones (most visitors arrive from social links on mobile) without regressing desktop. Content, copy, claims, and product truth stay EXACTLY as-is — this is a presentation-layer pass. No fabricated testimonials/stats/features.

## Verified current-state facts
- Routes: / (page.tsx wraps src/components/landing-page-content.tsx — a ~1,380-line "use client" component; the server wrapper checks the better-auth session cookie inside Suspense and passes hasSession), /about, /contact (form + own layout), /privacy, /terms. Infra: sitemap.ts, robots.ts, components/json-ld.tsx, hooks/use-mounted.ts, providers/app-providers.tsx.
- Landing sections in order: sticky h-16 max-w-6xl backdrop-blur header (wordmark + ThemeToggle + Sign In/Open button) → hero min-h-[calc(100svh-4rem)] with .ledger-rules background, serif display headline + Caveat subline, two lg buttons → "The Method" 3 feature cards (md:grid-cols-3) → live demo apparatus (md:grid-cols-3 interactive plates: editor + 5-mood selector col-span-2 with AnimatePresence quote swap + fake "Saving…"; working Diary Lock PIN pad, try 1234, shake-on-error; "This date · one year past" flashback note form; Unsplash polaroid keepsake stack with hover-tilt + hand-built lightbox overlay; simulated ZIP export progress bar; full-width year-at-a-glance heatmap, cells clamp(1.5rem,7vw,2.5rem), streak + mood-distribution bars, day cells open a vignette modal) → privacy band bg-secondary/40 border-y → CTA → footer.
- Two hand-rolled modal overlays exist (lightbox + day vignette): motion + fixed inset-0 z-50, manual Escape/scroll-lock/focus management.
- Desktop-first smells: demo plates sized as desktop tiles (min-h-95/min-h-80 dense 3-col grid collapsing to a long single-column scroll); polaroids literally say "Hover to tilt" (hover-only affordance); heatmap tooltips are group-hover only (no tap path); mood buttons grid-cols-3 mobile vs sm:grid-cols-5; about/contact/terms pages center vertically (justify-center min-h-screen py-16) assuming tall viewports.
- Performance invariants from prior passes: hero renders immediately (initial={false}) so LCP isn't blank until hydration — DO NOT regress; Unsplash images go through next/image (fill + lazy); the React.Suspense boundaries around AnimatePresence are REQUIRED by Next (AnimatePresence uses Math.random()) — removing them fails the build; no sonner Toaster in docs; fonts loaded via next/font/google in apps/docs/src/app/layout.tsx (Alegreya normal+italic, Caveat).
- apps/docs consumes @withink/ui source via transpilePackages — Phases 1–4 added sheet, dialog, and icon-button primitives there; USE them instead of hand-rolled overlays.

## Work
1. Demo apparatus phone-first: plates become full-width stacked cards with comfortable rhythm (no desktop-tile min-heights on mobile); each plate keeps its interactivity but works by TOUCH: polaroid tilt becomes tap-to-lift or gentle idle animation with the caption updated honestly; heatmap day details via tap (small dialog/popover) not hover; mood selector consistent grid-cols-5 at every width; PIN pad keys ≥48px; export progress stays automatic.
2. Replace BOTH hand-rolled overlays (lightbox, vignette) with the @withink/ui dialog (or sheet where bottom-sheet fits better), preserving Escape close, focus trap, scroll lock, and next/image usage. Lightbox gains swipe left/right between photos on touch.
3. Hero: verify at 375×812 — headline sizes via the fluid type utilities, CTAs thumb-sized and stacked comfortably, Caveat subline legible, .ledger-rules aligned; keep LCP-visible-on-load behavior.
4. Policy/reading pages (/about /privacy /terms /contact): comfortable reading measure on phones (no vertical-centering assumptions; top-anchored with generous but bounded padding), single-column contact form with ≥44px controls and proper autocomplete attributes, copy-email button works by tap.
5. Header: stays minimal (wordmark + ThemeToggle + one CTA); ensure 44px targets and safe-area awareness on notch devices.
6. Motion audit: everything 100–250ms via motion, staggered reveals preserved but gated behind prefers-reduced-motion, no scroll-jacking.
7. Update the docs surface brief (node .agents/skills/impeccable/scripts/surface-brief.mjs write apps/docs/src/components/landing-page-content.tsx <body-file>) with the phone-first decisions.

## Never break
The Suspense-boundary requirement around AnimatePresence (build breaks otherwise); session-aware CTA (server cookie check); json-ld/sitemap/robots; next/image for all remote images; CSP compliance in next.config.ts; no new dependencies beyond what packages/ui already provides; DESIGN.md rules (two type voices, One Accent Rule, Flat-Card Rule, App-Match Rule, lucide-not-emoji).

## Environment
Windows + pnpm. Run docs dev server via pnpm dev (docs on :3001). NEVER IS_PROD=true. Don't bump Node.

## Definition of Done
- pnpm --filter @withink/docs exec tsc --noEmit clean; lint 0 errors; pnpm build clean for BOTH apps.
- Batched browser pass: mobile 375×812 AND 320 — every landing section usable by pure touch (tilt/tap/heatmap/PIN/lightbox/vignette), no hover-only affordances left, no horizontal overflow; desktop 1440 unchanged-or-better.
- detect.mjs --json clean on changed files. No TODOs. PROJECT_STATE.md dated entry appended.
Stop at this scope. Report changes, verification evidence, deferred items.
```
