# Withink V2

# Project State

Last Updated: 2026-08-27

Current Phase: Post-Letters (Monetization Fast-Follows Advancing)

Current Milestone: Letters to Future Self SHIPPED (2026-08-27)

Project Status: 🟢 Release Ready

---

# Purpose

This document serves as the living memory of the project.

Unlike the PRD, Design System, or Architecture documents, this file changes throughout development.

Every AI assistant working on this repository should read this file before making any changes.

After completing a meaningful milestone, this file should be updated.

The objective is to eliminate repeated explanations between development sessions and maintain a consistent understanding of the project's current state.

---

# Project Overview

Withink is a premium digital journaling application focused on calmness, privacy, and long-term reflection.

The project is a complete rebuild of Version 1.

Version 1 exists only as a reference.

Version 2 is being built from scratch with a new architecture, improved user experience, stronger security, better performance, and significantly higher code quality.

---

# Repository Structure

```
/
│
├── apps/app/              ← Version 2 Dashboard App Layer (Deployed at app.withink.me)
│
├── apps/docs/             ← Public Landing & Policy Pages (Deployed at withink.me)
│
├── packages/              ← Shared workspace packages (@withink/ui, @withink/tokens, ...)
│
└── internal-docs/         ← Markdown engineering docs (Architecture, PRD, design system, logs)
```

---

# Source of Truth

Always follow documentation in this order:

1. PRD.md

2. DESIGN_SYSTEM.md

3. ARCHITECTURE.md

4. IMPLEMENTATION_PLAN.md

5. PROJECT_STATE.md

6. old (Reference Only)

If the existing project conflicts with documentation,

documentation wins.

---

# Tech Stack

Framework

- Next.js 16
- React 19
- TypeScript

Styling

- Tailwind CSS v4
- shadcn/ui

Animation

- Motion

Authentication

- Better Auth

Database

- MongoDB
- Mongoose

Caching

- Upstash Redis

Storage

- Cloudflare R2

Validation

- Zod

Editor

- Tiptap

Email

- Resend

Icons

- Lucide React

---

# Core Engineering Decisions

The following decisions should not be changed unless absolutely necessary.

## Architecture

Feature-first architecture.

Server Components by default.

Client Components only when required.

Server Actions preferred.

Minimal API Routes.

Business logic separated from infrastructure.

Repositories own persistence.

Services own workflows.

Validation exists before business logic.

---

## State Management

Prefer:

Server State

↓

URL State

↓

Component State

↓

Context

↓

Global State

Avoid introducing unnecessary global state libraries.

---

## Styling

Tailwind CSS only.

Use semantic design tokens.

Never hardcode colors.

Follow DESIGN_SYSTEM.md.

---

## Animation

Use Motion.

Never use Framer Motion.

Animations should be subtle.

Fast.

Purposeful.

---

## Forms

React Hook Form

+

Zod

for all forms.

---

## Data Fetching

Prefer Server Components.

Prefer Server Actions.

Use client fetching only for interactive experiences.

---

## Security

Encrypt journal content.

Validate every request.

Authorize every protected resource.

Never trust client input.

---

# Current Progress

## Completed Documentation

- PRD.md

- DESIGN_SYSTEM.md

- ARCHITECTURE.md

- IMPLEMENTATION_PLAN.md

---

## Phase 1

Foundation

Status:

🟩 Complete

---

## Phase Checklist

Phase 1

Foundation

🟩

Phase 2

Authentication

🟩

Phase 3

Application Shell

🟩

Phase 4

Design System Integration

🟩

Phase 5

Journal Editor

🟩

Phase 6

Journal Entries

🟩

Phase 7

Media

🟩

Phase 8

Search

🟩

Phase 9

Flashbacks

🟩

Phase 10

Insights

🟩

Phase 11

Settings

🟩

Phase 12

Export

🟩

Phase 13

Feedback

🟩

Phase 14

Performance

🟩

Phase 15

Accessibility

🟩

Phase 16

Testing

🟩

Phase 17

Production Readiness

🟩

Phase 18

Final Polish

🟩

---

# Current Goals

- **Letters to future self SHIPPED (2026-08-27 — see decision entry below).** Next queued per MONETIZATION_PLAN §10: curated themes/fonts, then the "later" tail (voice notes → PDF/book export → reminders+digest). Remaining pre-release items: the manual Dodo drills (portal-cancel downgrade, webhook replay, renewal-failure card, photo-quota paywall) and the docs-landing pricing copy swap.

---

# Current Blockers

None.

Note: MongoDB (`mongodb+srv://`) now connects. The earlier `querySrv ECONNREFUSED` was caused by a c-ares 1.34.6 regression in Node ≥ v24.13.0 (Windows DNS discovery returns no servers → falls back to `127.0.0.1`), not by WARP or app code — resolved by downgrading Node to v24.11.1 (c-ares 1.34.5).

---

# Recent Decisions

2026-08-28 (Letters — "Full codex letters" impeccable redesign)

- **`/letters/*` redesigned into the Annotated Codex's letter language** (impeccable pass, user-locked direction). New surface brief `.impeccable/surfaces/src-features-letters-components-letters-shell-tsx.md`. Visual system: letters are ledger-ruled paper slips (`.ledger-rules` masked ground) carrying a circular gold **wax-seal disc** (accent + embossed "w." monogram; `ring-inset` highlight — tokens only), folio numerals in the rail's serif-tabular voice, hand countdowns, and the reflection sheet's 2px gold gradient top edge reserved for arrived-unread letters. Opened letters show a broken-seal mark (dashed disc + MailOpen). Reader opens as a real letter page: ruled paper, serif 1.85 leading, gold drop cap on the first paragraph, running-head status line, hand byline. **Signature moment:** a delivered letter's first reveal breaks the seal — the disc scales/rotates away (0.55s expo-out, reduced-motion instant) while the letter lifts in. Composer joins the world: ledger-rules page ground + gold edge above the title (same as the journal editor's open page). Arrival card on the dashboard matches (gold edge + seal disc).
- **Craft-floor compliance:** removed the 2px colored left-border cards (now top gold edges per the sanctioned sheet idiom), no nested cards, one authored motion on the surface, drop cap drawn as type (no illustration), `word`/`words` pluralized. Detector `detect.mjs --json` clean on all three changed components.
- Verified: tsc clean, eslint 0 errors, full Vitest **257/257**, production build green, batched live inspection (desktop 1440 + mobile 375: shelf slips, arrived band with gold edges, reader drop cap + ruled page, composer ruled ground) — zero console errors. Test-account letters' unlockDates forced during inspection were restored (tomorrow / Dec 10).

2026-08-28 (Letters UX polish II — delete flows, calendar trigger, shared toolbar dock)

- **Delete flows fixed (both surfaces).** Root cause: success paths never cleared the dialog state — `letters-shell` missed `setDeleteTarget(null)`, composer missed `setDeleteConfirmOpen(false)`, so the confirm popup stuck under the toast. Composer delete also dropped its redirect: a bare `router.refresh()` after `router.push()` can win the race and CANCEL the pending navigation (observed live) — both composer exits (seal + delete) now wrap push+refresh in one `startTransition` so they serialize onto the new route. Plus a `deletedRef` guard so an in-flight/later autosave can never resurrect a deleted letter.
- **New shared `EditorToolbarDock`** (`features/journal/components/editor/editor-toolbar-dock.tsx`): the journal's fixed-bottom toolbar arrangement extracted verbatim (content-column centering via `md:left-[var(--sidebar-width)]`, `transition-[bottom]` glide, `AnimatePresence` fade/slide with reduced-motion instant swap, self-owned `visualViewport` keyboard-avoidance) and now consumed by BOTH the journal editor (zen `visible` gating + editor props passed through; `onBottomChange` keeps its scroll-padding wiring) and the letter composer (which gains caret scroll-padding parity). Journal regression-verified live: 206-word entry renders + toolbar identical.
- **Calendar trigger polish:** `gap-2` (the button primitive has no base gap) and `formatNumericDate` (new pure helper in `lib/utils/date.ts`, zero-padded dd-mm-yyyy, malformed passthrough) — trigger shows `21-09-2026` once a day is picked.
- Verified: tsc clean, eslint 0 errors, full Vitest **257/257** (+2 date tests), both builds green, live pass — shell delete closes popup + row vanishes + counter drops; compose delete closes popup + redirects to `/letters` (URL confirmed); trigger gap measured 8px; `21-09-2026` label; zero console errors.

2026-08-28 (Letters polish round — five user-reported issues fixed)

- **Sealing is now real** (the big one): a sealed letter is UNREADABLE and UNEDITABLE until its unlock day, enforced server-side. `LettersService.getLetter` takes `today` and throws `LetterSealedError` for sealed+future letters (reader/compose body access rejected — clock-tamper-proof); `upsertLetter` throws `LetterFrozenError` for sealed+future edits (message generalized: "A letter rests once it is sealed"). Compose page redirects sealed/delivered `?id=` back to the shelf. Sealed shelf cards render as dashed non-clickable rows (title + countdown visible per user call, delete stays allowed via a per-card IconButton — "deleted means deleted" preserved). Reader Edit only for unsealed drafts. +4 service tests (255 total).
- **Fresh shelf after save/seal**: the stale-list bug was Next's client router cache — `router.push("/letters")` alone served the pre-create RSC snapshot. Seal and delete pushes now pair with `router.refresh()`.
- **New `@withink/ui/calendar` primitive** (shadcn pattern on react-day-picker **v10** — installed; note v10 keeps the `UI`/`DayFlag` enums and `components.DayButton` of v9, DayButtonProps exported): tokenized month calendar (serif caption, ghost day buttons, accent selection, muted outside/disabled) hosted in the existing popover. Composer's native date input replaced by a calendar trigger button + hand note; strict-future preserved via `disabled={{ before: addDays(today,1) }}`.
- **Mood removed from letters entirely** (model, repo, schema, service, composer UI/payload, export manifest, tests). Mongoose strict mode makes the stale field inert on dev rows.
- **Toolbar moved to the bottom** (journal contract): composer now owns fixed bottom chrome — `visualViewport` keyboard-avoidance offset, safe-area padding, rendered only while the editor exists. `/letters/compose` joined the fullscreen route family: new shared `FULLSCREEN_ROUTE_PATTERN` in routes.ts (entries/[date] + letters/compose) consumed by both app-shell (no masthead/padding) and tab-bar (hidden); `EDITOR_ROUTE_PATTERN` retained for its original two consumers.
- Verified: tsc clean (app+ui), eslint 0 errors, letters+export suites 30/30, full Vitest **255/255**, both builds green, live pass — calendar pick→seal→shelf shows the new letter instantly WITHOUT reload, sealed-edit `?id=` bounce, dashed sealed cards, bottom toolbar + tab-bar absence on mobile, zero console errors. User's own sealed letter ("hahaha") exercised the production path.
- Deferred: reader Edit-while-sealed intentionally nonexistent (by design); "Re-seal" button dropped (sealed letters are immutable now).

2026-08-27 (Letters to Future Self — monetization fast-follow #2 shipped)

- **End-to-end feature shipped** (nav → compose → seal → delivery → archive → export). Verified: `tsc --noEmit` clean, eslint 0 errors on all touched files, focused suites 21/21 (letters) + export regression updated, full Vitest **251/251** (+21 over 230 baseline), production builds clean for BOTH apps, live browser pass (tier gates, ZK cipher audit, seal→arrival→reveal, mobile 375 no-overflow, zero console errors).
  - **Semantics (locked):** an "active" letter = `unlockDate` strictly in the viewer's future; delivered letters free their slot. Capacity asserted ONLY on creation (`LettersService.assertCapacity` reads `EntitlementsService.getEntitlements`; Pro skips entirely). Editing active letters is NEVER re-priced (downgrade grandfathering, mirrors notebooks). Delivered letters are FROZEN — upsert throws `LetterFrozenError`; dragging a delivered letter back into the future is refused (no past-rewrites); deletion always allowed. Sealed drafts whose day passes unsealed become delivered too. Reveal is server-gated on the server-resolved `today` (`withink-local-date` cookie → fallback) so client clock tampering can't surface a letter early; first reveal stamps `readAt`.
  - **Data spine:** new `features/letters/` (model `letters` w/ `{userId,unlockDate:-1}` index; repo with meta projection sans bodies for lists + `listArrivedUnread` for the dashboard; zod schema bounds identical to entries; pure `lib/letter-rules.ts` — isDelivered/occupiesSlot/countdownFor — fully unit-tested). Account deletion purges `letters` (wired into `deleteAccountAction` Promise.all). Export ZIP gains `letters/<year>/<Month>/` txt+html + a `letters[]` manifest block (bodies stored as-is — cipher for ZK, matching the entries precedent; export-service.test updated for the new metadata shape).
  - **ZK:** composer encrypts title/contentHtml/contentText/contentJson client-side (`encryptText` per field, same format as entries); repository stores verbatim; server never sees plaintext. Lists/reader/composer decrypt on mount from the in-memory master key with skeleton/spinner states. DB audit confirmed `iv:tag:cipher` hex in all three fields, wordCount 35, zero plaintext leakage.
  - **UI:** rail + More sheet renumbered with LETTERS as **04** (after Notebooks; authored artifacts cluster together — plan text had said 05, deviation is deliberate): Today01 Entries02 Notebooks03 Letters04 Flashbacks05 Insights06 Media07 Settings08 Feedback09. `/letters` shell (bespoke header voice, arrived-unread gold band, sealed cards w/ hand countdown, opened archive, reader dialog with plain-text paragraphs — no raw-HTML rendering, no new XSS surface, delete via shared ConfirmDialog). `/letters/compose` reuses TiptapEditor + EditorToolbar (toolbar's zen/ambient props already optional-guarded — zero toolbar changes) with server-direct autosave (1.5s debounce, single-flight ref, visibility/pagehide flush via ref indirection, empty-draft guard: no unlock date or no ink ⇒ no server write). Free/Plus pre-check opens `UpgradeDialog reason="letters"` on compose mount before typing; server re-trips it via `LETTER_LIMIT_REACHED` code. Paywall copy added to the union. Dashboard gains `LetterArrival` (Suspense-wrapped server fragment + client decrypt card) between hero and lower grid — renders only when a delivered letter is unopened.
  - **Bugs found BY the live pass (all fixed):** (1) fresh letters stuck on spinner — `decryptedContent` lazy init didn't match the no-decrypt path; (2) editor visually wiped after first save — `key={letterId}` remounted Tiptap when a fresh draft earned its server id; key is now the composing-session id; (3) second autosave wrote an empty payload over the good draft (consequence of #2's remount snapshotting the empty doc — signature dedupe prevented nothing because the payload genuinely differed); (4) autosave read `decryptedContent` (mount seed) instead of the live `editorContent.json` for `contentJson` — edit-flow would have mounted an empty doc; (5) reader caption used the stored `sealed` flag instead of delivery state ("sealed for" shown on an opened letter).
  - **Test-account side effects:** `test@test.com` billing row toggled free→plus→pro during gate drills (restored to pro); one demo letter remains on the account (opened archive state, intentional like the "Night Thoughts" notebook).
  - Deferred (documented, not regressions): reminder/notification emails for delivery (needs scheduler infra — stays in the "later" tier row); letter images included in export image scan (entries-only today; letters reference R2 only via the shared editor pipeline); per-letter read-state sync across devices beyond server `readAt`.

2026-08-27 (ZK editor hard-reload ciphertext race FIXED — pre-release blocker cleared)

- **Shipped the fix for the blocker surfaced during the revision-history pass:** a hard reload straight onto `/entries/[date]` as a ZK account (unlock cookie still valid server-side, master key memory-only) could mount Tiptap rendering CIPHERTEXT with an inflated word count until one SPA navigation away+back healed it. Reproduced twice previously; now verified green in the exact repro shape.
  - **Root cause chain (confirmed across app-shell/encryption-provider/journal-editor-shell/tiptap-editor):** `EncryptionProvider` boots `isClientEncrypted=false`; AppShell seeds server settings in a `useLayoutEffect`, but the shell's inline `loadContent` could execute with a stale closure still seeing `false` during that window → took the plaintext branch → committed cipher title/content into the freshly mounting Tiptap. The later flag-flip re-ran the effect and decrypted correctly into React state, but Tiptap's `content` option only seeds AT CREATION (`tiptap-editor.tsx:129`) — prop changes post-mount are ignored, so the live document kept the ciphertext it was born with. Title self-healed because `<input>` is controlled; the editor surface did not.
  - **D1 (primary): all load branching extracted to a pure resolver**, `features/journal/services/editor-load.ts` — `loadEditorContent(facts, port)` returns `{kind:"wait"}` for the unseeded window and the ZK-keyless beat (spinner shows via existing `decryptedContent===null` render branch), or `{kind:"resolved", commitTitle?, mood?, notebookId?, contentJson, editorSeed}`. The module imports nothing from the app — cache/crypto arrive via injected `EditorLoadPort`, keeping every branch unit-testable. Shell owns the title field entirely now (initializes `""` instead of seeding `initialTitle`, killing the transient cipher-title flash); text/heuristics behavior preserved byte-for-byte (cache-hit priority over server props, per-field decrypt-failure isolation, colon-payload detection).
  - **D2 (defense-in-depth): authoritative repaint guard.** After any re-resolution while an editor instance is alive, `commands.setContent(contentJson)` applies ONLY if the live `getJSON()` still equals the normalized snapshot captured at mount (`consumedDocSignatureRef`, set in `handleEditorReady`) — user typing diverges it and always wins. Repeated identical resolutions dedupe through `appliedJsonSigRef` before touching any state (streamed RSC refreshes re-identical objects without resetting inputs). Same wholesale path the revision-restore feature proved.
- Verified: `tsc --noEmit` clean, eslint 0 errors on changed files, focused vitest 12/12 (`editor-load.test.ts`: THE regression pin + keyless wait, legacy passthrough ×2, cache-hit priority/notebook fallback/mood null-downgrade, fresh-decrypt success, title-fail keeps current title, content-fail falls back to empty doc, non-colon passthrough parity), full suite **230/230** (+12 over the ~218 baseline), production builds clean for BOTH apps (`NEXT_WORKER_CONCURRENCY=2`).
- **Live browser verification (DevTools MCP, fresh dev server, test@test.com ZK):** hard reload directly on `/entries/2026-08-20` mid-session → Diary Password unlock → DECRYPTED title "A chapter before bed — 2026-08-20", plaintext paragraphs, honest **206 words**, immediately post-unlock; console clean (one benign preload warn). Baseline SPA-navigation render unchanged. Same session trap as before: an old stale `next dev` held :3000 serving PRE-FIX code — kill the port owner before testing.
- Flagged NOT fixed (adjacent latent issue, separate milestone if ever observed): if `(app)/layout.tsx`'s encryption-settings fetch ever fails, `initialEncryptionSettings=null` seeds all-false provider defaults (`app-shell.tsx` layout effect) and a true-ZK account would then short-circuit to the wrong `MandatoryDiarySetup` branch; the new editor resolver also trusts the seeded flag as its truth source. Low likelihood, no known reproduction.

2026-08-27 (Revision history REMOVED — reverted to pre-feature surface)

- **Product call: the single-slot restore point pulled entirely.** User decision after the live verification pass — one previous-version checkpoint per day felt too niche to justify the feature surface, the dialog, and a pricing-matrix row.
  - **Everything reverted:** `features/revision-history/` deleted (model, repository, service, action, dialog + their tests); `journal-service-revision.test.ts` deleted; `journal-service.ts` save path back to pre-feature (no capture call, no slot stamp, no purge on delete); `entries/[date]/page.tsx` meta fetch removed; editor History chip/dialog removed; `deleteAccountAction` purge removed; `entry-model.ts` lost the nullable `revisionCapturedAt` field (stale nulls on dev docs are inert — Mongoose strict mode ignores them); `plans.ts` lost the reserved `revisionRetentionDays` (interface, 3 matrix values, and all test mocks updated). Full-suite expectations return to the ~218 baseline.
  - **Docs:** MONETIZATION_PLAN §2 matrix row deleted; §3 records the removal + the locked re-add design (10 checkpoints/day, retention-gated age, list dialog); §10 queue is notebooks-shipped → future letters → curated themes/fonts. The pricing page (apps/docs) never mentioned the feature — zero marketing cleanup needed.
  - **Pre-existing finding surfaced by today's verification (STILL OPEN, unrelated files):** after a full reload directly on `/entries/[date]` as a ZK account, unlocking can leave the TIPTAP EDITOR rendering ciphertext (wrong word count) until one SPA navigation away+back heals it — an editor-mount/`isClientEncrypted`-flip race. Reproduced twice. Should be its own milestone before release.

2026-08-27 (Revision history — monetization fast-follow #2 shipped, then removed same day; kept as historical record, see removal entry above)

- **Single-slot revision history shipped end-to-end.** Verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing `clearAllTimers` warnings), focused suites 67/67 (+33 new), full Vitest run below in the verification entry, `pnpm build` for both apps.
  - **Semantics:** ONE previous-version snapshot per journal day, overwritten in place (`entryrevisions` collection, unique `{userId,date}`). Captures are THROTTLED to one checkpoint per hour (`REVISION_CAPTURE_INTERVAL_MS`; pure `shouldCaptureRevision`) — autosave fires every ~1.5s, so unthrottled capture would make the slot a one-and-a-half-second-old copy. First-ever capture is immediate; stale-slot captures refresh the timestamp.
  - **Zero-knowledge preserved:** snapshots store `title/contentHtml/contentText/contentJson` EXACTLY as received from the entry being overwritten (ciphertext under ZK; plaintext for legacy accounts). The server never decrypts; the dialog decrypts locally with the in-memory master key (`decryptText`, same `"iv:cipher"` heuristics as the editor's load branches).
  - **Save-path wiring:** `JournalService.saveJournalEntry` edit branch calls `RevisionHistoryService.captureIfDue(userId, date, existingEntry)` BEFORE the repo upsert — best-effort by contract: failures log a warn and the diary save proceeds untouched (tested). The slot timestamp mirrors onto the entry as a new nullable `revisionCapturedAt` field (default null) ONLY when a capture landed this save, so the throttle reads one document instead of two collections. CREATEs never capture; deletes purge the day's slot (`deleteEntry` → `purgeForDate`); account deletion purges all revisions ("deleted means deleted", wired into `deleteAccountAction`'s Promise.all).
  - **Retention = read-time gate:** `Entitlements.revisionRetentionDays` (Free 7 / Plus 90 / Pro ∞ — already reserved+pinned in plans.ts) is checked against `capturedAt` at READ time (`isRevisionWithinRetention`, pure); expired rows stay harmlessly stored but read as absent — no scheduled-jobs infra needed. The `getRevisionForDateAction` re-checks retention server-side per fetch (rate-limited 30/min/user, zod date validation, session+lock checks).
  - **UI:** editor header gains a quiet History chip (next to the notebook chip) rendered only when a viewable snapshot exists — the route passes `revisionCapturedAt` meta from `EntryRevisionRepository.getMeta` (a `.select({capturedAt:1})` projection so no ciphertext ever enters the RSC stream). Dialog previews the decrypted PLAIN TEXT (deliberate: no rich-HTML render outside Tiptap = no new XSS surface) with hand-font "kept {time}" caption + mood/words staying implicit; Restore applies title/mood/JSON wholesale and repaints the live Tiptap via `editorInstance.commands.setContent(json)` (`content` prop only seeds mount), flowing through normal autosave afterwards. React-compiler contract honored: dialog states resolve asynchronously (single `LoadResult` union), never synchronously in effect bodies.
  - **Documented v1 edge:** restoring within an hour of the last capture skips re-snapshotting the pre-restore version (the overwrite yields to the throttle). Consciously accepted — the restore confirmation flow makes intent explicit, and the discarded text remains recoverable via editor undo until reload/lock. Revisit alongside multi-version timelines (retention tiers upgrade path).
  - **Live browser verification (same day, DevTools MCP on `withink_dev`, test@test.com ZK):** full loop green — edit seeded Aug-23 entry → snapshot captured (chip renders after next server render, by design) → dialog decrypts locally with master key and previews the PRE-EDIT text → Cancel leaves page untouched → Restore reverts wholesale through `editorInstance.commands.setContent` + normal autosave, verified persisted via fresh server render (218 words, marker gone). Keyboard: Enter opens, Escape closes. Mobile 375×812: icon-only chip per <sm convention, dialog fits + scrollable preview, restore round-trip OK. Wire audit of `getRevisionForDateAction`: request is date-only; response carries ciphertext-only fields + metadata — zero plaintext leakage; offline attempt dies at network layer with spinner + no hex.
  - **Hardening fixes found BY the live pass:** (1) a full page reload mid-session leaves the provider keyless for a beat — the dialog could previously render RAW CIPHERTEXT as "preview"; now it refuses to fetch without a master key (spinner until deps refire) and a final `looksCiphertext` guard swaps in an "Unlock your diary…" note instead of ever showing hex. (2) Escape/dialog close now returns focus to the History chip (`handleHistoryOpenChange` + chip ref) since Radix can't restore to a programmatic invoker.
  - **Pre-existing finding (NOT revision-related, left open):** after a full reload on `/entries/[date]` as a ZK account, unlocking can leave the TIPTAP EDITOR itself rendering ciphertext (and word count wrong) until one SPA navigation away+back heals it — the loadContent/`isClientEncrypted`-flip race in the editor mount path. Reproduced twice pre-fix and post-fix; unrelated files untouched by this feature. Worth its own milestone before release.

  - Deferred (documented, not regressions): multi-version timeline per day (v1 = single slot by plan §3), restore-offline queue payload marker, lazy purge of expired rows.

2026-08-26 (Notebooks — monetization fast-follow #1 shipped)

- **Polish pass (same day, user feedback):** (1) notebook cards are now WHOLE-CARD LINKS to `/entries?notebook=<id>` — the entries page honors the param server-side (invalid ids degrade to "all") and the shell mirrors filter changes into the URL via `router.replace` (deep-linkable, refresh/back-safe); card Rename/Delete/Make-default stop propagation, keyboard Enter/Space handled. (2) Move dialog extracted to shared `notebooks/components/move-entry-dialog.tsx` (editor chip + timeline both use it; compiler lint forced a derived-preselection pattern instead of setState-in-effect); its Select gains `w-full` (the primitive's `inline-flex` wrapper collapses width in dialogs — that was the "unstyled dropdown"). (3) Timeline rows gain a visible FolderInput move button when >1 notebooks; ZK accounts trigger `journalSyncService.requestSync` after a move so local metadata learns the new filing. (4) Scoped empty state: a filtered-empty notebook shows "This notebook is waiting for its first page" + New Entry CTA carrying the notebook param. (5) Docs `/pricing` gained honest tier lines (1/3/10 notebooks). (6) Card footer wraps (`flex-wrap`) — fixed Delete peeking outside the card at narrow widths. All verified: tsc clean, lint 0 errors (3 pre-existing warnings), 218/218 Vitest, both production builds clean, browser pass (card click→URL→scoped view, move dialog styling, footer wrap at 502px, no horizontal overflow). Note: a stale `next start` holding :3000 served an OLD build during verification — kill the port owner before restarting or you'll test stale code.
- **Notebooks shipped end-to-end.** Verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing `clearAllTimers` warnings), full Vitest **218/218** (+22), `pnpm build` clean for BOTH apps, live browser pass (desktop 1440 + mobile 375×812 emulation, zero horizontal overflow).
  - **Semantics (user-locked):** one entry per day GLOBALLY (PRD §27 intact) — each day's reflection is FILED into a notebook and movable later. Insights/streaks/flashbacks/search/dashboard stay global across notebooks. Only EMPTY notebooks are deletable (no mass-delete path). Downgrade grandfathering per MONETIZATION_PLAN §1: creation gated, everything existing stays fully usable.
  - **Tier decision (user):** notebook caps are finite — Free 1 / Plus **3** / Pro **10** (`plans.ts` reserved fields went live; `plans.test.ts` pins updated; MONETIZATION_PLAN §2 + §3 marked shipped). Pro-at-cap renders a calm informational dialog (no CTAs); Free/Plus get the standard paywall via `UpgradeDialog reason="notebooks"` (New Notebook stays visible+tappable at the limit — Option A).
  - **Data spine:** new `features/notebooks/` (model `notebooks` collection with unique `{userId, nameLower}`; repository returning serialized `NotebookRecord`s; `NotebooksService`; zod name schema 1–60 chars whitespace-collapsed; rate-limited actions create 10/h + shared write bucket 30/min). `entries` gained nullable `notebookId` + non-unique `{userId, notebookId, date:-1}` index; unique `{userId, date}` untouched.
  - **Lazy bootstrap:** `ensureBootstrapped` creates the default "Journal" on first notebooks read, backfills ALL null-notebook entries in one indexed `updateMany` (verified live: 120 seeded entries filed), and promotes the oldest survivor when a default is deleted. **Render-safety fix found in browser pass:** bootstrap must NOT call `revalidateTag` during RSC render (Next 16 hard error on /notebooks) — split `EntryRepository.bumpUserEntryVersion` (Redis INCR only, render-safe) from `invalidateUserEntryCache` (INCR + insights tag, actions/routes only). Filing changes no insights data, so the bump is semantically sufficient.
  - **Save path:** `saveEntrySchema.notebookId` (optional ObjectId string); `saveEntryAction` resolves the target server-side (owned id passes; unknown/foreign id coerces to default — offline saves never fail or land cross-tenant); `saveJournalEntry` applies it CREATE-ONLY (edits never re-file — mirrors date grandfathering). New `moveEntryToNotebookAction` + `setDefaultNotebookAction` (ownership-checked, version-bumping).
  - **Local-first sync:** `METADATA_VERSION` 2→3 (one-time per-device metadata refetch backfills `notebookId`; regression test proves v2 records refetch); document_cache/sync_queue payloads carry `notebookId`; `use-auto-save` threads it through persist/enqueue/legacy paths (deliberately NOT in `isDataDirty` — moves are explicit actions, never autosave); flush stamps local metadata from the SERVER-returned notebookId (post-coercion truth).
  - **UI:** new `/notebooks` page (PageHeader voice, cards with entry counts + last-written + gold "new pages land here" default marker, create/rename RHF+zod dialogs, delete via shared ConfirmDialog, paywall/cap dialogs, counter chip). Rail renumbered 01–08 with Notebooks as 03 (More sheet matches; tab bar untouched). Entries page: notebook Select (desktop, >1 only) + filter-sheet chips + removable chip row + timeline meta label; New Entry link carries `&notebook=`. Editor header: quiet "Filed under X" chip → Move dialog (Select + confirm, query invalidation).
  - **Export:** `metadata.json` entries gain `notebook` (name, resolved server-side); README line updated; archive layout unchanged.
  - **Env note for future builds on this machine:** with heavy system memory pressure the app build OOMs at default concurrency — `NEXT_WORKER_CONCURRENCY=2` (build.mjs honors the env override) completed cleanly twice.
  - Deferred (documented, not regressions): per-notebook insights/flashback scoping (explicitly out of scope v1), notebook covers/colors/reorder, parallel same-day entries, deleting the test account's demo "Night Thoughts" notebook (left in `withink_dev` intentionally).

2026-08-25 (Billing Phase D — monetization launch-complete)

- **Monetization Phase D — paywall moments, post-checkout UX, and Lifetime removal.** Verified: `tsc --noEmit` clean (both apps), eslint 0 errors (3 pre-existing warnings), full Vitest **196/196** (+3 route-quota tests; lifetime cases removed), `pnpm build` clean for BOTH apps.
  - **Lifetime removed everywhere (launch decision).** `PLAN_PRODUCTS` is subscription-only (`plus-monthly/yearly`, `pro-monthly/yearly`); webhook payment branch now subscription-only; `resolvePlanFromAccount` dropped the lifetime rule; model/summary lost the field; checkout action lost the duplicate-purchase guard; settings card lost the Lifetime row + Founding Member state; docs `/pricing` is a 3-column grid; env/examples/vitest mock lost `DODO_PRODUCT_PRO_LIFETIME`. MONETIZATION_PLAN §2 records the deferral decision. No real sales existed → zero migration.
  - **Paywall dialog** (`features/billing/components/upgrade-dialog.tsx`): controlled Radix dialog with `reason: "storage" | "backfill"` driving gate-specific copy ("photo space is full" / "beyond your writing window"). Option-A CTAs — Plus $4.99/mo + Pro $9.99/mo buttons redirect straight into hosted checkout via shared `hooks/use-checkout-redirect.ts` (single checkout implementation reused by the settings card). Yearly billing stays in Settings only.
  - **Gate #2 wiring:** tiptap-editor + editor-toolbar parse upload errors before their base64 fallback — a `507 storage_quota_exceeded` removes the placeholder image and opens the paywall instead of silently embedding base64. Upload-route fix: avatar/feedback folders are exempt from the quota check AND usage recording (service storage was never counted by the counter — a maxed Free user could previously not attach feedback screenshots); new `route.test.ts` covers 507 payload shape + exemptions.
  - **Gate #1 wiring:** calendar sealed days (expired & empty) are no longer dead cells — clicking opens the backfill paywall; they keep a muted style with hover affordance and honest aria-labels ("Writing window ended before…"). Future days stay locked; entries remain clickable at any age.
  - **Post-checkout banner:** Dodo's return_url lands on `/settings?status=…`; new `billing-return-banner.tsx` (Suspense-wrapped) shows one dismissible success/cancelled banner then `router.replace` strips the query so refresh/back never reshow it.
  - **Manual drills remaining (user-run, test mode):** downgrade via portal cancel → grandfathering verified; webhook Replay → idempotency; renewal-failure card `4000 0000 0000 0341` → past_due keeps access; paste photos to quota → paywall → buy Plus → limit lifts.

2026-08-25 (Billing Phase C)

- **Monetization Phase C — Dodo Payments billing wired end-to-end.** Verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing warnings), full Vitest **196/196** (+37 new), `pnpm build` clean for BOTH apps (`/pricing` and `/api/webhooks/dodo` in route manifests).
  - **Deps:** `dodopayments` SDK (server-only; typed checkout/portal/webhook payload unions) + `standardwebhooks` (spec-official HMAC webhook verification — hand-rolled crypto rejected for security-critical code).
  - **Env:** `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, five `DODO_PRODUCT_*` ids added to `config/env.ts` as **optional** (Redis pattern): app boots Free-tier without them, checkout/portal/webhook degrade with a clear message instead of crashing; `.env.*.example` + vitest env mock updated.
  - **Checkout:** `createCheckoutAction(productKey)` — auth → zod enum over `PLAN_PRODUCTS` keys → rate limit 10/h/user (`LIMITS.BILLING`) → blocks duplicate lifetime purchase → `dodo-service.ts` creates hosted session (`product_cart` from server-side env product ids, `metadata:{userId,productKey}` is the webhook's attribution path, `return_url=BETTER_AUTH_URL/settings`) → single-use URL. `openCustomerPortalAction()` opens Dodo's customer portal when a `dodoCustomerId` exists.
  - **Webhook** (`app/api/webhooks/dodo/route.ts`): raw-body read (1MB bound) → `standardwebhooks.verify` (timing-safe) before any parse → JSON.parse bounded → Redis SET-NX dedupe on `webhook-id` (7d TTL; fail-open because all writes are idempotent upserts) → pure mapping → upsert via repository → `EntitlementsService.invalidateCache`. Unconfigured secret ⇒ 503. Processing failure releases the claim so Dodo retries apply it.
  - **Event mapping** (`services/dodo-webhook-mapping.ts`, pure + unit-tested): subscription active/renewed/plan_changed/updated/unpaused → plan shape from our product id + status active + period end from `next_billing_date`; failed/on_hold/paused → past_due (still grants paid access per Phase A rules); cancelled/expired & refund.succeeded → canceled. payment.succeeded: lifetime line in cart grants Pro forever (`lifetime=true`, interval null); subscription payments only restore status=active (period end owned by subscription events); unknown products ignored.
  - **Settings Plan card:** new client `features/billing/components/billing-section.tsx` mounted as a "Plan & billing" SettingsGroup (between Your data and danger zone). Loads via `getBillingSummaryAction` (plan/status badge/renewal date, entitlements-at-a-glance row, portal "Manage subscription" button, upgrade cards Plus/Pro with monthly+yearly buttons, dashed Lifetime $199 row, Founding Member state for lifetime). Redirects use `window.location.assign`.
  - **Docs `/pricing`:** static marketing page mirroring the §2 matrix (Free/Plus/Pro/Lifetime cards, featured Pro, privacy guarantees block), APP_URL resolved like the landing page; canonical tier source remains MONETIZATION_PLAN §2.
  - Next: Phase D — paywall/upgrade dialogs on gate trips (upload 507 + backfill window), downgrade-path test + webhook replay drill in Dodo test mode, then ship.

2026-08-25 (Billing Phase B)

- **Monetization Phase B — all three launch gates wired to entitlements.** Verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing warnings), full Vitest **159/159**, production build clean.
  - **Gate #1 backfill window (Free 14d · Plus 90d · Pro ∞):** new pure helper `backfillWindowStart(today, days)` in `lib/utils/date.ts` (returns null when unlimited — no Invalid-Date math). `JournalService.saveJournalEntry` takes `options.backfillDays` (legacy default 1 = today-or-yesterday preserved for direct callers); Rule B now throws "beyond your writing window" only for NEW entries — editing an existing day is always allowed regardless of age. `saveEntryAction` resolves entitlements server-side (authoritative). Editor-route firewall (`entries/[date]/page.tsx`) and entries-page calendar (prop-threaded page→shell→calendar, single memoized windowStart shared by click handler + cells) both honor the plan window; dead `BACKDATE_GRACE_PERIOD_DAYS` removed from `limits.ts`.
  - **Gate #2 media quota (100MB/10GB/50GB):** upload route replaces hardcoded 50MB with `EntitlementsService.getEntitlements().mediaStorageBytes` (Redis usage counter unchanged); `media-service` derives `limitMB` per viewer; gallery formats ≥1024MB as GB.
  - **Gate #3 device soft-kick (1/3/∞):** Better Auth `databaseHooks.session.create.after` → new `features/billing/services/session-cap-service.ts` (`enforceOnSessionCreate`): counts raw `session` collection docs, deletes OLDEST beyond cap FIFO (never the just-created session), skips entirely on Infinity, sends a best-effort courtesy email ("New device sign-in - withink.") via Resend after a successful kick, and swallows ALL failures — billing can never block sign-in.
  - Test updates: new `journal-service-save.test.ts` (window boundaries incl. ∞, edit-grandfathering, legacy fallback), `entry-actions.test.ts` asserts entitlements→service pass-through, `media-actions.test.ts` mocks EntitlementsService + expects Free-tier 100MB stats, `settings-actions.test.ts` @/lib/db mock gains DB_NAME.
  - Next: Phase C — Dodo checkout/webhooks, env vars, settings Plan card, docs `/pricing`.

2026-08-25 (Billing Phase A)

- **Monetization Phase A — billing/entitlements spine (no behavior change yet).** Strategy locked and written to `internal-docs/MONETIZATION_PLAN.md` (tier matrix, Dodo Payments integration design, launch gates, deferred roadmap). New feature folder `features/billing/`: `config/plans.ts` is the canonical entitlements matrix (Free 14d backfill / 100MB / 1 session · Plus 90d / 10GB / 3 · Pro ∞ / 50GB / ∞; reserved fields for fast-follow features) + `PLAN_PRODUCTS` mapping for the five Dodo products incl. lifetime; `repositories/billing-account-model.ts` + `-repository.ts` (lazy `billingaccounts` collection — absence of a row means Free; upserts reserved for webhook use only); `services/entitlements-service.ts` resolves tier via Redis cache (`billing:{userId}:plan`, 60s TTL) over Mongo with fail-to-Free semantics (gates never throw/block), `lifetime=true` forces Pro regardless of status, `past_due` keeps paid access as dunning grace, `canceled` → Free. Callers mutating rows must call `EntitlementsService.invalidateCache(userId)`. 16 new Vitest tests (matrix pinned to locked numbers, resolution rules, cache hit/miss/degrade, copy-isolation). Verified: `tsc --noEmit` clean, eslint clean on `features/billing`, full suite 146/146, production build clean.
  - Next: Phase B gates (backfill window in entry save path replacing `BACKDATE_GRACE_PERIOD_DAYS`, per-tier media quota in upload route, session soft-kick hook), then Phase C Dodo wiring.

2026-08-25 (Phase 5)

- **Mobile-first redesign, Phase 5 — Public site (apps/docs) phone-first pass.** Presentation-only; copy, claims, product truth byte-identical. All verified: `pnpm --filter @withink/docs exec tsc --noEmit` clean, eslint 0 errors, `pnpm build` clean for BOTH apps, impeccable detector `[]` on all 8 changed files, batched browser pass at 375×812, 320×700, and 1440×900 (light/dark tokens untouched).
  - **Demo apparatus works by pure touch.** Plates are full-width stacked cards on phones (desktop-tile `min-h-95/80/75` now `md:`-only). Mood selector is `grid-cols-5` at every width (53px targets; labels drop to 10px/untracked below `sm:` so "RADIANT" fits at 320 — verified no wrap). PIN pad keys `h-12` on phones / `h-10` from `sm:` (verified unlock flow 1-2-3-4 by tap). Flashback note input + submit ≥44px (verified save-by-tap). Export progress unchanged (automatic, verified running). Heatmap day details open by TAP only — the group-hover tooltip is deleted (cells keep the sanctioned `clamp(1.5rem,7vw,2.5rem)`; 26px at 375, tap opens the vignette).
  - **Hover-only affordances eliminated.** Polaroid keepsakes: "Hover to tilt · Click to enlarge" replaced by a gentle staggered idle sway (motion, `useReducedMotion`-gated; verified animating and clipped within the plate) + honest caption "Tap any keepsake to enlarge"; pointer hover still lifts/straightens as a non-essential enhancement; the hover-only dim overlay on thumbnails was removed with it.
  - **Both hand-rolled overlays replaced by `@withink/ui/dialog`** (user decision: Dialog for both — centered card preserves the desktop presentation at every width). Radix now owns focus trap, Escape, and scroll lock; the Phase-1 overlay motion system owns the 200ms/150ms movement; the manual focus-ref/scroll-lock/Escape effects are deleted. `keepsake-lightbox.tsx` (new): index-based state, motion `drag="x"` swipe between photos (64px + velocity threshold, same contract as the app's media lightbox — verified 1/3→2/3 by synthetic touch drag), "n / N" counter chip, 44px prev/next IconButtons, ArrowLeft/Right keys, `next/image` (fill, priority-while-open). `day-vignette-dialog.tsx` (new): July-N header + mood badge, entry title as DialogTitle, quote as DialogDescription, words + "kept for later." hand note. The editor-quote AnimatePresence keeps its required Suspense boundary (build green proves the invariant held); the two overlay AnimatePresence blocks no longer exist.
  - **Hero + chrome.** Headline moved to the fluid `text-hero md:text-display` utilities (no fixed `text-5xl` step; verified at 375 and 60px at 1440); `initial={false}` LCP behavior preserved (hero rendered in first screenshot pre-hydration). Header CTA `h-11 md:h-10`; header pads `env(safe-area-inset-top)`, footer `env(safe-area-inset-bottom)`; footer links are 44px rows; CTA-section button full-width on phones. Docs root layout gained a `viewport` export: `viewportFit: "cover"` + dual theme-color metas (#eee5d6 light / #1e170f dark, matching the shared token values).
  - **Reading pages top-anchored.** `/about`, `/privacy`, `/terms`, `/contact` drop `justify-center min-h-screen` for bounded `py-10 md:py-16` (verified h1 near the top at 320/375). Contact form: 44px name/email/submit (verified computed heights), autocomplete attributes already correct, copy-email is now a 44px `IconButton size="lg"` with the gold-check copied state (verified by tap), social rows 44px, "Send Another Message" 44px on phones.
  - **Surface brief.** Phone-first decisions written via `surface-brief.mjs write` → `apps/docs/.impeccable/surfaces/apps-docs-src-components-landing-page-content-tsx.md` (file-scoped brief alongside the existing app-level `apps-docs.md`).
  - Deferred (documented, not regressions): inert `animate-in fade-in` utility classes on the about page and contact success card (no tailwindcss-animate in docs — silent no-ops, cosmetic); built-in DialogContent close is the primitive's 36px (system convention; primary closes all work via Escape/veil/44px alternatives); lightbox double-tap zoom (native pinch works); splitting the remaining ~1,230-line landing component (overlays extracted this pass; further splitting deliberately deferred as before — high regression risk on a marketing page); heatmap cells are 26px tap targets at 375 by the DESIGN.md-sanctioned clamp (tap path exists and is verified).

2026-08-25

- **Mobile-first redesign, Phase 4/4 — Finish (consistency, a11y/responsive audit, performance, docs).** Bounded passes per the impeccable skill: one batched inspection round (research fact sheet + live keyboard/a11y/responsive sweep), one batched fix round, one confirm round. All verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing `clearAllTimers` warnings), 130/130 Vitest, production build clean (21 routes, PPR ◐ preserved), impeccable detector `[]` on all 33 changed files (one known false positive: the `<img[^>]*src=` scrub-regex string in media-lightbox).
  - **Consistency sweep.** Insights header migrated onto the shared `PageHeader` (hand-rolled DOM + its date `useEffect` deleted); ~50 copy-pasted eyebrows across ~20 files (incl. `page-header.tsx`/`page-loading.tsx` themselves) now use `text-running-head` — tracking drift (0.12/0.14/0.15/0.2em) eliminated; auth/gate card eyebrows normalized to the same voice. Tracked-caps ACTION links (View Archive / RE-READ ENTRY) intentionally remain the control voice, not eyebrows. IconButton primitive adopted at media-lightbox close, sidebar collapse toggle; media grid/list toggles and insights month chevrons bumped from `size="sm"` (36px) to the 44px default; flashbacks header actions ("Show another"/"Home") h-9→h-11 on phones; auth password-visibility toggles given 44px hit areas. Sanctioned exceptions documented: editor toolbar h-10 (Phase-2), weekday grid headers (10/11px grid labels), settings theme swatch hexes, chart `var(--color-accent, #c39553)` fallbacks.
  - **State coverage.** New `(app)/error.tsx` route-group boundary (keeps the shell mounted; reports to `/api/monitoring/errors`) and `(app)/feedback/loading.tsx` skeleton mirroring the form card. Insights timezone-refetch failure now surfaces a quiet toast (was console-only). Toast conventions verified consistent (~100 sonner calls, zero bare `toast()`).
  - **A11y.** More-sheet focus restore fixed by making the More tab a real `SheetTrigger` inside a `Sheet` root that wraps the nav (Escape/trigger close restores focus to the trigger — verified live; the first attempt placed the trigger outside the context and was caught by the confirm round). Keyboard-only walkthrough green: tab order (skip link → header → content → tab bar), editor toolbar via keyboard (Enter activates, focus returns), sheets/dialogs focus restore, PIN-pad keyboard listeners unchanged. Contrast computed from tokens in both themes; dark `--destructive` hardened `oklch(0.62→0.66 0.13 30)` (3.97→4.76:1 vs dark card); light passes fully (accent 4.90:1, ring 4.90:1).
  - **Z-index contract restored.** Media lightbox root `z-50→z-[60]` (could under-stack sheets); unlock-proof-bind-card `z-[9990]→z-[9999]`; sidebar popover off-contract `z-50` dropped (local stacking).
  - **Responsive.** Zero horizontal overflow measured at 320/375/414/768/1024/1440 and landscape-phone editor (812×375); gates fit short viewports; sticky entries search verified pinning below the header; desktop 1440 rail/two-column unchanged.
  - **Performance.** Build route report identical to baseline (21 routes; main routes PPR ◐). Per-route client chunks: editor cluster 78.4→78.0KB (smaller), settings 57.4→57.4, media 17.9→17.8, insights +1.1KB (toast + PageHeader), others ±0.1. Gate screens still statically imported; client jszip still lazy (`await import` in data-export-card); images all `next/image` (raw `<img>` only in the email template). **Mobile Lighthouse (prod build, DevTools MCP): A11y 100 / Best Practices 100 / Agentic 100 on `/`, `/entries`, `/entries/[date]`; SEO 54–63 by design (private app is noindex; the meta-description flag on the editor route fires only in the locked-state HTML); CLS 0.**
  - **Two production bugs the audits flushed out (both pre-existing, both fixed):** (1) the inline service-worker script referenced `process.env.NODE_ENV`, which is undefined in the browser → ReferenceError on every production load; the branch is now resolved server-side in `layout.tsx` (production registers, dev unregisters). (2) `public/sw.js` contained TypeScript syntax (`url: URL` annotation) → "ServiceWorker script evaluation failed" — offline support never actually worked in production; annotation removed, `node --check` clean, registration verified green in the Lighthouse pass.
  - **Documentation of record.** `DESIGN.md` restructured as a two-surface doc: a new app-surface section written from the BUILT world (hardened accent/ring/destructive oklch values, fluid type + `text-running-head`, shipped component inventory, z-index/touch/safe-area rules, sanctioned exceptions) with the docs-surface section preserved below. All six `.impeccable/surfaces/` briefs carry Phase-4 finalization notes. Impeccable critique on the flagships (degraded single-context run — subagent provider was down): editor 35/40, dashboard 34/40, no P0/P1; snapshots in `.impeccable/critique/`.
  - **Manual regression script** (run before any release; test@test.com / test@123, diary password test@test): sign in → unlock with Diary Password → write today's entry, watch Saving…→Saved·Synced → go offline (DevTools), type more, confirm "Saved locally · Will sync", reconnect, confirm queue drains to 0 → search a title and a "Jul 1"-style date → flashbacks: open, "Show another", re-read → insights: month pager, tap a day popover, stats → media: upload an image in the editor, open the lightbox, swipe prev/next, delete via confirm (verify scrub) → settings: toggle theme, paper scale, enable Diary Lock (PIN 1234), auto-lock, lock now, unlock with PIN, disable lock → export ZIP (verify entries + images) → lock → logout → sign in again.
  - **Deferred debt (carried):** manual retry affordance on save-failed (auto-backoff converges); toolbar `(Ctrl+…)` hints in aria-labels; sub-360px toolbar nudge; lightbox double-tap zoom (native pinch works); year-summary ribbon for insights; persisting settings disclosure state; tiptap v3 StarterKit duplicate-extension warning; export streaming (JSZip buffers); media gallery virtualization; entries search below the fold at 375 (Phase-3 IA); `Button size="icon"` legacy variant (only the editor toolbar consumes it); meta-description on the editor route's locked-state HTML (noindex app — cosmetic).

2026-08-24

- **Mobile-first redesign, Phase 3/4 — Browse surfaces (entries, insights, media, flashbacks, settings, auth/gates, feedback).** Presentation-only pass; no data-layer, cache-key, scrubbing, or export changes. All verified: `tsc --noEmit` clean (app + ui), eslint 0 errors (3 pre-existing `clearAllTimers` warnings), 130/130 Vitest, production build clean (PPR preserved), browser pass at 375×812/667 and 1440×900, Impeccable detector clean on changed files (one false-positive "broken-image" warning on the pre-existing `<img[^>]*src=` scrub regex in media-lightbox).
  - **ONE destructive convention (locked):** visible ⋮/icon trigger → shared `ConfirmDialog` (`src/components/confirm-dialog.tsx` on the Phase-1 Dialog; busy-lock via `onEscapeKeyDown`/`onPointerDownOutside`/`onInteractOutside` preventDefault). Applied to entries delete, media delete, account deletion. All hover-reveal deletes and inline Yes/No strips are gone.
  - **Entries phone-first.** Shell is a single column on phones in strict order: PageHeader → sticky search+Filters (`entries-controls.tsx`, `sticky top-0 z-20` inside `#main-content`, active-count badge + removable filter chips) → compact month pager → one-line folio row (`entries-folio.tsx`, `120 Streak · 120 Entries · 222 Avg words`; the ruled 3-up card survives on lg) → full-width timeline cards (clean date·words meta row, visible kebab) → pagination. Search/filter state lifted to the shell; page resets to 1 via render-time filter adjustment (no setState-in-effect). Filters open the Phase-1 bottom Sheet of 44px chips (aria-pressed, Clear all); desktop keeps the two-column grid with sticky rail and inline shared-Select filters. Grid `order` utilities reorder phones; explicit `lg:col-start/row-start` placement keeps desktop identical.
  - **Insights fully touch-usable.** The 365-day GitHub-style strip (min-w-[760px] scroll, hover-only tooltips) is REPLACED everywhere by a month-by-month pager: IconButton chevrons, month label + per-month reflections/words caption, one month of intensity squares with legible numerals (ink-on-gold at every step), tappable day → `Popover` (words · mood · "Open this reflection" link). Mood-trend nodes and volume bars use the same Popover with enlarged transparent hit targets — no dead tooltips. Stats passage tightened to 2-up phone density with correct 2×2/4-up dividers; monthly review uses the shared Select and a 2-up mood grid (5th tile spans). Lazy `InsightsCharts` chunk split preserved; data layer untouched.
  - **Media.** Grid captions (filename + date over a gradient scrim) are ALWAYS visible — the hover-only "View Memory" overlay is gone. Storage meter is a compact one-row card on phones. Sort = shared Select; toggles/refresh = IconButton. Lightbox: motion drag-to-swipe prev/next (threshold+velocity, `touch-pan-y`), "n / N" counter chip, arrows desktop-only, phone Close button, delete behind ConfirmDialog wrapping the byte-identical scrub-then-delete flow (verified end-to-end in-browser: upload → caption → lightbox → confirm → scrub → R2 delete → empty state).
  - **Settings restructured.** Five ruled groups — Profile / Appearance & paper feel (merged) / Privacy & security (password + ZK + Diary Lock together) / Your data (connected accounts + export + sign out) / Danger zone in its own destructive band, always expanded. Phones get disclosure groups (`settings-group.tsx`): stateful trigger `lg:hidden` + static header `hidden lg:flex` + one body render with responsive visibility — pure CSS, no media-query JS, SSR paints correctly on both breakpoints (plus a reduced-motion-gated `.animate-disclosure` reveal in theme.css). ALL bespoke overlays migrated onto Phase-1 primitives as self-contained components: `delete-account-dialog.tsx`, `zk-setup-dialog.tsx`, `zk-change-dialog.tsx` (encryption feature), `lock-change-dialog.tsx` (replaces lock-change-modal; 3-step PIN flow intact), and `LockSetupOnboarding variant="dialog"` for Settings while the app-shell first-launch prompt keeps the GateLayout gate. Radix owns focus trap/Escape (dismissal locked while migrating/deleting); forms stay react-hook-form + zod; toggles carry `role="switch"`; lock-timeout uses the shared Select.
  - **Auth + gates.** `(auth)/layout.tsx` dropped `overflow-hidden` (tall register card now scrolls on short phones instead of clipping) and uses `min-h-dvh`. Autocomplete audit: email/current-password/new-password/name across login, register, forgot, reset (OTP inputs already correct). LockScreen keypad gained `navigator.vibrate(10)` haptics on key/backspace (same pattern as the editor toolbar). GateLayout structure untouched; gate fits 375×667 without scrolling.
  - **New primitives:** `@withink/ui/select` (tokenized native `<select>` + chevron — the ONE select pattern: media sort, monthly overview, lock timeout, desktop timeline), `@withink/ui/popover` (non-modal anchored card on the Phase-1 overlay motion system). **Critical overlay fix:** Tailwind v4's `-translate-x-1/2` compiles to the standalone `translate` property, which COMPOSES with the Phase-1 overlay animation's animated `transform` — every centered Dialog rendered double-offset (half off-screen). `dialog.tsx` now carries an `overlay-centered` class whose static offset exists only under `prefers-reduced-motion: reduce`; during normal motion the animation's `--withink-overlay-rest` solely owns centering (verified x=16px at 375).
  - **Flashbacks:** 375 measure/padding tune, header actions compressed (h-9 phone, "Home" label), reader feel preserved. **Feedback:** full-width submit on phones, 71px category cards, remove-screenshot target ≥44px.
  - **Browser-pass evidence:** 375×812 — entries order + sticky search + filter sheet chips + kebab dialog; insights pager + day popover; media captions + lightbox counter/swipe-stage + confirm delete; settings disclosures + centered migrated dialogs; flashbacks refresh reachable; feedback form clean. 375×667 — gate fits, register scrolls. 1440 — two-column entries with inline selects + folio card, centered pager, settings fully expanded (triggers `display:none`), no overflow anywhere at either width. Dev-server note: a long-wedged dev server produced a phantom `/media` InternalError + hung RSC stream; fresh restart resolved it (R2 reachable, page verified).
  - Deferred: lightbox double-tap zoom (native pinch works), year-summary ribbon for insights, persisting settings disclosure state, Phase 4 polish/migration sweep.

2026-08-24

- **Mobile-first redesign, Phase 2/4 — The Writing Experience (fullscreen editor + phone-first dashboard).** Presentation-only pass over the journal editor and dashboard; autosave/sync semantics byte-identical. All verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing `clearAllTimers` warnings), 130/130 Vitest, production build clean (21 routes, PPR preserved), browser pass at 375×812 and 1440×900, Impeccable detector `[]` on all changed UI files.
  - **True fullscreen editor route.** `EDITOR_ROUTE_PATTERN` (`/entries/[date]`) moved to `constants/routes.ts` as the single source of truth (shell + tab-bar now share it). `app-shell.tsx` renders fullscreen routes through a documented conditional wrapper: no mobile masthead, no tab bar, and NO content-padding wrapper (the old `max-w-4xl px-6 py-8` nest that double-padded the editor is gone — no negative-margin hacks). `journal-editor-shell.tsx` rewritten as the ONE owner of fixed overlays on the route: root is `min-h-full` (fills the shell's `<main>`, which remains the only scroll container), `ledger-rules` + top gradient became scoped/removed, the scroll-progress hairline now listens to `#main-content` scroll (it previously tracked `window.scrollY`, which never moves in this layout — dead bar fixed), z-pileup resolved to the contract (header 20 / overlays 40 / Radix 60). Inner writing column is a `div` (no nested `<main>` landmark).
  - **Thumb-first toolbar.** Primary row always visible and scroll-free at 375px: undo/redo · B/I/U · bullet · task · "+" · sticky-right word-count chip (bare count on phones, "+ Xm read" sm+). "+" opens the Phase-1 Sheet (`side="auto"`): H1–H3, strike, highlight, ordered list, quote, code, clear, LINK, IMAGE — deduped against the primary row (user decision). Link insertion replaced `window.prompt` with a focus-trapped Dialog (URL input, Insert/Remove, Enter submits). Image picker fires `input.click()` synchronously inside the gesture before the sheet closes (iOS Safari requirement); compress→presign→R2→base64 flow unchanged. Desktop md+ keeps the full inline strip (zero desktop regression) and gains the sheet as a right folio panel. h-10/w-10 targets, haptics, and the visualViewport keyboard-avoidance mechanism preserved; toolbar bottom now adds `env(safe-area-inset-bottom)`.
  - **Save state into the editor header on phones.** `SaveIndicator` gained an `inline` variant rendered from the SAME state machine (all states preserved: Saving… / Saved · Synced / Saved locally · Syncing / Saved locally · Will sync / Session locked — pending save / Save failed / Working offline). Phones read it as quiet text in the new sticky editor header row (back · hand-font date · save state · zen toggle); the floating pill is now `hidden sm:block` at z-40. Verified live: idle→Saving…→Saved·Synced→idle; offline (DevTools Offline) type→local save→`sync_queue` drained to 0 after reconnect (queue convergence confirmed in IndexedDB).
  - **Zen mode on phones** hides ALL floating chrome (header, toolbar, pill); tapping the page reveals the toolbar for 3s (typing keeps it alive; reduced-motion gets instant swaps); Escape exits on keyboards; entry/exit routed through one `toggleFocusMode` callback (no reset effect). Desktop zen unchanged.
  - **MoodSelector** hit targets now 44px (`h-11 w-11`, `sm:h-10 sm:w-10`); row sits directly under the title, above the fold at 375×812.
  - **Phone-first dashboard.** Inline header deleted; `PageHeader` reused (runningHead "Today", note, Good morning + gold accent, viewer-local `today`). Order: Today card → streak margin note → flashback → recent reflections (single column on phones, `md:` grids preserved). Empty-state CTA copy is "Write today's entry"; both Today-card CTAs are thumb-sized (`h-11 w-full sm:w-fit`). Yesterday-missed banner extracted to `YesterdayBanner` (client): calm hairline card, inert `animate-in` classes dropped, session-dismissible via `sessionStorage` keyed by the missed date (`safeStorage.setSessionItem` added).
  - **Skeletons mirror the new layouts.** `(app)/loading.tsx` matches the PageHeader + Today-card/margin-note order with a thumb CTA hint; `DashboardHeroSkeleton` drops the data-dependent banner placeholder; `entries/[date]/loading.tsx` now imports the rewritten `EditorSkeleton` (fullscreen mirror: header row, 44px mood circles, toolbar silhouette) instead of duplicating stale markup. Z-index contract comment in `globals.css` updated to name the single overlay owner.
  - **Browser-pass evidence (375×812):** fullscreen editor chrome-free (no masthead/tab bar); sheet, link dialog, mood, zen tap-to-reveal/auto-hide all work by touch; cross-date pending-edit flush survives real navigation (blur→snapshot flush→unmount save; a programmatic `.click()` bypasses blur and can drop the last ≤400ms — synthetic-only artifact, real taps/keyboard are covered by the existing pipeline). Desktop 1440: rail, full inline toolbar, save pill, dashboard grids unchanged.
  - Deferred: yesterday banner visual states unreachable with seeded data (yesterday always written); tiptap v3 StarterKit duplicate link/underline extension warning (pre-existing, editor internals out of scope); sub-360px toolbar nudge under the sticky chip (safety-net scroll retained); Phase 3 browse surfaces, Phase 4 migrations.

2026-08-23 (latest)

- **Mobile-first redesign, Phase 1/4 — Foundation (IA, app shell, primitives).** The dashboard is now phone-first: navigation on phones moved from the hamburger drawer to a native-style bottom tab bar; the desktop folio rail stands untouched. Visual identity unchanged (Field Ledger / Annotated Codex). All verified: `tsc --noEmit` clean (app + ui), eslint 0 errors (3 pre-existing warnings), 130/130 Vitest, production build clean, browser pass at 375×812 and 1440×900, Impeccable detector clean.
  - **Bottom tab bar** (`features/app-shell/components/tab-bar.tsx`, rendered by `app-shell.tsx`, `md:hidden`): Today `/` · Entries `/entries` · Insights `/insights` · More (sheet). Active state via `usePathname` with tracked-uppercase micro-labels + lucide icon + gold top tick (mirrors the rail's tick language); `aria-current="page"`. Hidden on the editor route `/entries/[date]` (regex in both tab-bar and shell) and while lock gates are up (`!isGated`). Bar: `fixed bottom-0 z-[60] bg-card/90 backdrop-blur-md border-t`, 56px hit targets, `pb-[env(safe-area-inset-bottom)]`; page content reserves matching clearance (`pb-[calc(4.75rem+env(safe-area-inset-bottom))]`) except on the editor route. **Mobile header slimmed to wordmark + ThemeToggle**; the hamburger + slide-in drawer were removed as unreachable code (sidebar.tsx is now desktop-rail-only).
  - **More sheet**: Media, Flashbacks, Feedback, Settings rows carry the rail's folio numerals; plus theme row and account row (avatar/name/email/sign-out). Sign-out logic extracted to `features/app-shell/hooks/use-sign-out.ts` (sidebar reuses it); avatar markup extracted to `components/user-avatar.tsx`.
  - **New @withink/ui primitives** (source-consumed, per-component subpath exports): `sheet` (unified `radix-ui` Dialog; side variant `auto|bottom|top|left|right` where auto = bottom sheet on phones → right panel md+; rounded-t-2xl, hairline border, blurred veil, safe-area padding), `dialog` (centered card, sm/md/lg, shadow allowed for overlay elevation), `icon-button` (cva: h-11 w-11 → md:h-9 w-9 default; **required `aria-label` prop enforced in types**). Radix owns focus trap + Escape for both overlays. `radix-ui` added to packages/ui deps.
  - **Overlay motion system**: discovered the app's existing `animate-in`/`slide-in-from-*` classes are inert (no tailwindcss-animate plugin under Tailwind v4 — they silently no-op). New shared block in `packages/tokens/theme.css`: keyframes driven by Radix `[data-state]` via `data-slot="overlay-panel"/"overlay-veil"` + per-placement `--withink-overlay-from/to/rest` custom properties (so centered dialogs keep their -50% offset). 200ms in / 150ms out, expo-out easing, entirely inside `prefers-reduced-motion: no-preference` (reduced-motion users get instant open/close and correct static positioning because resting transforms live in classes too).
  - **Z-index contract** documented as a comment map in `apps/app/src/app/globals.css`: content 0 < sticky header 20 < rail 30 < editor overlays 40–50 < nav chrome (tab bar/sheet/dialog/drawer) 60 < gates 9999. New pieces comply; legacy values left alone this phase.
  - **Toaster**: sonner now renders `bottom-center` on `<md` with offset `calc(env(safe-area-inset-bottom) + 4.75rem)` (above the tab bar) and stays `top-right` on desktop, via a new SSR-safe `hooks/use-media-query.ts`. `viewportFit: "cover"` added via a `viewport` export in `apps/app/src/app/layout.tsx` so iOS safe-area insets are real.
  - **Fluid display type**: `text-display/hero/h1/h2/h3` in `packages/tokens/theme.css` converted to `clamp()` curves that hit the exact historical px at ≥1024px (desktop unchanged, verified computed 36px h1 at 1440) and scale down to ~min at 375px (verified 20.8px h3 at 375). Body/label/caption steps stay fixed rem. Added `@utility text-running-head` (serif 11px / 0.16em caps) and `@utility text-hand` (Caveat 24px); existing ad-hoc usages intentionally NOT rewritten yet.
  - **Direction contract** amended in `apps/app/src/app/layout.tsx` (one appended MOBILE-FIRST REVISION line; identity unchanged). Shell surface brief written to `apps/app/.impeccable/surfaces/pp-src-features-app-shell-components-app-shell-tsx.md`.
  - Verification detail: full-page loads of ZK accounts re-ask for the Diary Password (master key is memory-only) — during that gate the tab bar is correctly hidden; unlock restores it. No horizontal overflow on /, /entries, /insights, /media at 375px; editor route chrome-free; desktop 1440 rail = 264px expanded, everything else visually identical.
  - Deferred to Phases 2–4: editor + dashboard redesigns (Phase 2), browse surfaces entries/insights/media/settings/auth (Phase 3), mass IconButton migration + bespoke-overlay→Sheet/Dialog migration + polish/audit/docs (Phase 4).

2026-08-23 (later)

- **Fixed "every page stuck on skeleton" in local dev — three stacked root causes, all verified live in a driven browser session:**
  1. **Unlock-proof brick (primary):** `unlockSessionAction`'s strict verification rejected when `unlockProofHash` was unbound — but the documented first-use migration never existed. Any account that enabled zero-knowledge BEFORE proof binding shipped (incl. the seeded `test@test.com`) could decrypt locally yet never mint the unlock cookie; every authed action returned "Locked" and pages stayed gated/empty forever.
     - **Seed fix:** `seed-test-user.cjs` now computes and binds `unlockProofHash` at creation time (Node `crypto.hkdfSync` mirroring `deriveUnlockProofHex` + sha256); seed re-run so `test@test.com / test@123 / diary test@test` works out of the box.
     - **Real-account migration:** new email-code flow for unbound legacy accounts. `unlockSessionAction` returns sentinel `"UNLOCK_PROOF_NOT_BOUND"`; the provider flips `proofBindingRequired` and AppShell renders a one-time `UnlockProofBindCard` ("Email me a code" → 6-digit input). New `bindUnlockProofWithCodeAction` verifies the code via the existing reset-code channel (`LockService.verifyResetCodeAndBindProof`, timing-safe, single-use) and binds `sha256(proof)` + mints the cookie. Secure: only a valid login session AND the victim's inbox can complete it.
  2. **Dev-only flight corruption (the crash):** after unlock, `router.refresh()` intermittently killed the app with `TypeError: Cannot read properties of null (reading 'enqueueModel')` (React flight client parsing a corrupted stream). Root cause of the corruption: **the service worker ran in development**, cache-first serving `_next/static/*` whose dev URLs collide across compile sessions — stale JS executed against fresh RSC payloads. SW registration is now production-only (`layout.tsx`), and in dev it self-unregisters and clears caches on load. Also deferred the post-unlock refresh to the next task as belt-and-braces.
  3. **Pre-seed wrong-UI window:** `MandatoryDiarySetup` mounted during the brief gap before server-seeded encryption settings landed, flashing the wrong screen and firing migration-list actions on every page load. Provider now exposes `encryptionSettingsSeeded`; AppShell renders a neutral pulse placeholder until seeding resolves.
- **Resilience hardening found during diagnosis:** Redis client calls (`get/set/incr` + rate-limit pipeline) now race a 1.5s timeout and fail open — a hanging Upstash endpoint previously stalled every await silently (fail-open catches don't fire on hangs). IndexedDB `getDB()` no longer caches rejected open promises (an SSR-time call would have poisoned all future client operations for the session).
- Verified end-to-end in-browser on the dev server: sign-in → diary-password unlock → dashboard/entries/insights/media/settings/flashbacks/editor all render fully decrypted; re-lock after the seeded 300s auto-lock behaves correctly. `tsc --noEmit` clean, eslint 0 errors (3 pre-existing warnings), 130/130 Vitest, production build clean.
- Note for devs: if you ever see `enqueueModel` crashes or stale behavior after pulling code, unregister the old service worker once (DevTools → Application → Service Workers → Unregister) or just run any post-fix build — the new layout script cleans it up automatically.

2026-08-23

- **Full-stack bug-fix & hardening sweep** (security, data-loss, correctness, a11y/responsive polish). All verified: `tsc --noEmit` clean across the workspace, eslint 0 errors (3 pre-existing `clearAllTimers` warnings unchanged), 130/130 Vitest tests, production builds clean for both apps.
  - **Unlock-cookie forgery closed (critical):** `decrypt()`'s legacy fail-open behavior returned non-colon input verbatim, so `isSessionUnlocked` accepted a hand-crafted cookie (`{"userId":…,"expiresAt":…}`) as a valid unlock token. New strict `decryptToken()` (`lib/encryption.ts`) requires exactly `iv:authTag:ciphertext` with hex segments AND GCM auth verification; the lock service now uses it. Legit cookies are unaffected; `decrypt`/`safeDecrypt` remain for legacy content migration only.
  - **Cross-date editor carryover fixed:** `/entries/[date]` mounted `JournalEditorShell` without `key={date}`, so navigating between dates reused the instance — stale title/mood/html/text from date A armed autosave under date B (fallback load branches spread `prev`, keeping A's html/text). The shell is now keyed by date (full remount per day) and load branches replace editor state wholesale.
  - **Sync data-loss fixes:** `flushOfflineSyncQueue` now compare-and-deletes queue items (re-reads the item after the server round-trip; if autosave enqueued a newer payload mid-flight it stays queued instead of being destroyed), the pull prune loop re-checks `getSyncItem(date)` immediately before deleting each date (an entry created mid-pull can no longer be purged from all three stores), `getAllSyncItems` rejects on failure instead of returning `[]` (which prune misread as "nothing pending"), soft-failing entry fetches count toward `failedCount` so the fast-path fingerprint isn't committed over missing entries, and `syncDiaryCache` gained a single-flight guard so concurrent triggers (unlock/online/visibility/interval/idle) piggyback on one pull instead of interleaving.
  - **Encryption provider consistency:** context exposes a wrapped `setMasterKey` that updates both state and `masterKeyRef` (setup/settings flows previously desynced the ref → `getUnlockProof()` returned null → PIN bound without proof). `derivedKeyCache` is evicted per failed attempt and fully cleared on `lock()` (raw diary passwords no longer persist in memory past lock; re-unlock re-runs PBKDF2 ~100ms in the worker).
  - **Export cross-tenant read closed:** export images must match the requesting user's own `journal|avatars|system/{userId}/` prefix (same pattern as media delete) before an R2 GET is issued.
  - **Server throttles added** (per-user Redis limiter): entries search/list 30/min, insights action 6/min, find-entry-for-media 10/min, delete-account password check 5/5min. Insights inputs (`todayStr`, `timezoneOffset`) are zod-validated/clamped BEFORE building the cache key (unbounded key minting + forced recomputes closed). Monitoring endpoints cap field sizes (message 2KB / stack 8KB / ids 128) and client error reports are IP-limited 20/5min.
  - **ZK migration ordering:** `enableClientEncryptionAction` writes+verifies all migrated entries FIRST and flips `isClientEncrypted` last (mid-failure can no longer leave partially plaintext accounts marked ZK); migration payloads validated with a bounded zod array schema.
  - **Deletion hygiene:** account deletion now also purges `system/{userId}/` (feedback screenshots survived deletion before).
  - **Hydration/crash-safe storage access:** new `safeStorage` helper (never throws) used by app shell, settings shell, editor shell, lock change modal, and encryption provider. Device lock flags, `hasLocalEncryptedKey`, `paperScale`, `diaryLockEnabled`, and `deviceHasPin` sync from localStorage in effects instead of render-time initializers (removes SSR/client mismatch teardown; paper-scale persist effect is gated on load so mounting can't clobber the saved scale). Editor-shell localStorage reads can no longer crash the route in private-browsing modes.
  - **Timezone/date correctness:** `PageHeader` accepts `today` and every call site passes the viewer-local value resolved via the `withink-local-date` cookie (server pages read the cookie; client shells thread `localToday`); sidebar note and insights header date compute after mount (no hydration mismatch across timezones, no stale-across-midnight text).
  - **ZK ciphertext flash removed:** dashboard recent-reflections list and entries timeline receive a server-derived `encrypted` flag; ZK users see skeleton rows until decryption resolves instead of base64 blobs in the server HTML (`initialData` is only used for non-ZK accounts).
  - **A11y:** editor toolbar actions moved to `onClick` (keyboard users could not operate any of ~20 controls — mousedown-only); focus trap recomputes its tab list per Tab press (multi-step modals no longer cycle stale element lists); LockChangeModal and both settings ZK modals got `role="dialog"`, `aria-modal`, Escape handling, and the focus trap (labels wired with htmlFor/id); clear-search/refresh/delete-memory icon buttons have aria-labels.
  - **Reliability/perf tail:** IndexedDB connection is cached module-level with `onversionchange` close handling (was a new unclosed connection per operation); stale-date flush waits out any in-flight save (two write chains can't race the same stores) and saves for previous dates never touch the current session baseline/dirty state; pending edits flush the moment the master key arrives (no more waiting out the 30s locked-retry timer); tiptap snapshot flushes on `pagehide`; `saveEntrySchema` bounds `contentHtml/contentText/wordCount`; theme-color metas match actual token values (#eee5d6 / #1e170f, converted from oklch); literal `&apos;` entity and h2-without-h1 heading skips fixed.

2026-08-23

- **Full-stack audit remediation pass** (security lock integrity, data-loss fixes, reliability, performance, a11y/visual). All verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing warnings), 130/130 Vitest tests (12 new), production build clean, browser visual pass on docs landing + app login (dark & light).
  - **Lock integrity (critical security):** The diary lock was bypassable three ways; all are closed.
    1. `unlockSessionAction` minted the unlock cookie with zero proof of any secret — any authenticated session could call it from devtools. It now requires an unlock proof: client derives `K' = HKDF-SHA256(masterKey, info:"withink-unlock-proof-v1")` (`deriveUnlockProofHex` in `crypto-client.ts`); server verifies `sha256(K')` against a new stored `unlockProofHash` on LockSettings with `timingSafeEqual` (`LockService.hashUnlockProof`/`verifyUnlockProofHash`). K' is content-independent (never used for AES-GCM of entries) so zero-knowledge for journal content is preserved. Verification is STRICT: unbound hashes can never mint cookies (no trust-on-first-use window).
    2. Binding points that prove knowledge legitimately: `enableClientEncryptionAction` (accepts optional `unlockProof`, binds at ZK setup), first-time passcode setup in `saveLockSettingsAction`, and `unlockAction(pin, unlockProof?)` (passcode verified against passcodeHash server-side → safe to bind/reset the proof). Reset flows (`verifyPasswordAndResetLockAction`, `verifyResetCodeAndDisable`) clear the binding alongside the passcode hash.
    3. `saveLockSettingsAction` privileged-transition guard: disabling an enabled lock OR enabling when a passcode already exists (rotate or re-enable without new secret — both previously minted unlock cookies) now require `currentPasscode` (verified vs passcodeHash) or `unlockProof` (verified vs bound sha256). Clients attach the proof silently wherever the master key is already in memory (`EncryptionProvider.getUnlockProof()` via ref mirror; settings toggle, PIN setup onboarding, change-PIN modal sends `currentPasscode`) — zero added friction for unlocked users, locked attackers get rejected.
  - **SSR lock gate:** `(app)/layout.tsx` now renders `LockedContentPlaceholder` instead of page children when the session is locked, so entry titles/ciphertext never stream in HTML/RSC while locked (previously the layout comment admitted "lock is enforced client-side"). After unlock, AppShell/LockScreen fire `onUnlockedSynced` → `router.refresh()` only once the cookie is confirmed (provider password path awaits `unlockSessionAction`; PIN fast-path fires it after background `unlockAction` resolves) — reveal stays instant, real content streams in behind (~1 RSC round trip), no full reload.
  - **Data loss (writing path):**
    - Date-change navigation no longer drops pending edits: `use-auto-save` captures the previous render's payload (`prevDataRef`) and flushes it via a dedicated local-first persist keyed by the OLD date before resetting baseline/timers (`flushStaleDateEditsRef`). Previously up to ~1.9s (1500ms autosave debounce + 400ms editor snapshot) of typing was silently lost across date switches.
    - `tiptap-editor` flushes its pending snapshot on unmount instead of clearing the timer.
    - Deleted entries no longer resurrect: `diaryCacheService.deleteLocalMetadata` and the sync-pull prune loop purge ALL THREE IndexedDB stores (metadata + document_cache + sync_queue). Previously `document_cache` was never cleared (`deleteDocument` had zero callers), so the editor reloaded deleted content and re-pushed it to the cloud; a lingering sync-queue item would also re-push explicitly.
    - IndexedDB writes are strict: `diaryCacheDB.setDocument`/`setSyncItem` now reject on failure so `useAutoSave.persist()` returns `"error"` (visible error state + backoff retry) instead of reporting "Saved · Synced" while nothing was stored.
  - **Reliability:** editor `loadContent` effect got a cancellation guard (stale A→B resolutions can't commit cross-date content); the pull path re-checks the per-date sync queue immediately before each write (mid-pull edits are never clobbered) and the fast-path fingerprint is committed only when every fetched entry succeeded (partial failures return false so the sync service retries rather than skipping); image-compressor worker jobs have a 20s timeout + `onerror` handler that rejects all pending promises and terminates/recreates the worker (no more forever-pending upload placeholders that could get saved into entries).
  - **Performance / data layer:** export endpoint rate-limited (3/hour/user) and returns the ZIP as ArrayBuffer directly (kills the duplicate whole-archive Buffer copy; full streaming documented as deferred debt — JSZip buffers internally by design and archiver would be a new dependency); insights action Redis cache is version-keyed (`insights:action:{userId}:v{version}:...`) so entry writes invalidate it instantly instead of serving up-to-5-minutes-stale data; `getEntriesListAction` args zod-clamped (page≤10k, limit≤50, mood 1–5 nullable, search≤200 chars, ISO today) closing operator-injection/full-collection dumps; search `$regex` input escaped (`EntryRepository.escapeRegExp`) against ReDoS/injection; mood/timeFilter list branches now use the same projection as search (`userId: 0, contentHtml: 0, contentJson: 0`) so filtered pages stop shipping ciphertext blobs; empty-day reads use a `__withink_null__` sentinel in Redis (old cached nulls degrade to one extra Mongo read then upgrade); Mongoose + raw MongoClient both got explicit `serverSelectionTimeoutMS: 5s`, `connectTimeoutMS: 10s`, `socketTimeoutMS: 45s`, `maxPoolSize: 10`.
  - **Security tail:** `checkIdentityExists` validates email format and is rate-limited 10/hour per IP (headers-based), failing closed; media upload presigning enforces the 50MB quota server-side (Redis usage counter, 300s TTL, self-reseeding from R2 truth), rate-limits presigns (30/10min), whitelist-only folders, MIME-derived extensions; `deleteAccountAction` purges `locksettings` + `clientencryptionsettings` + `feedback` and requires login-password re-auth for credential accounts (`password?` param; OAuth-only accounts keep type-to-confirm; settings delete modal shows a password field when a credential account exists); reset-code comparison is timing-safe; `logger.SENSITIVE_KEYS` now redacts email/mail/passcode/pin/proof; `saveLockSettingsAction` caps autoLockTimeout at 86400s (was unbounded); media delete ownership is a strict prefix match over journal/avatars/system namespaces (was substring containment).
  - **A11y / visual polish:** light-mode `--accent` deepened to `oklch(0.50 0.105 75)` (≈4.9:1 measured against composited card backgrounds — passes WCAG AA normal-text; dark mode unchanged at ~7.7:1), light-mode `--ring`/`--sidebar-ring` share the value (≥3:1 non-text for focus indicators); mobile nav drawer wrapper raised to z-[60] so the editor toolbar/save indicator no longer paint above the open drawer; gate screens are now properly modal (`inert` on the shell while gated; DiaryPasswordUnlockScreen gained the focus trap the other gates had); gate headings normalized to `<h1>`; skip-link target `<main tabIndex={-1}>`; header hamburger + ThemeToggle hit 44px on mobile (ThemeToggle md:h-9 preserves desktop density); dual `theme-color` metas (light #EADFC7 / dark #211d17) so mobile browser chrome stops staying cream in dark mode; theme transitions and the tiptap placeholder fade gated behind `prefers-reduced-motion: no-preference`; docs contact headings fixed h1→h3 skip.
  - Deferred (documented, not regressions): full archive streaming for export (JSZip buffers internally; archiver = new dependency); media gallery virtualization/R2-list cap (full listing required for correct stats; quota-bounded counts make this low priority); lightbox delete using the client's decrypted-HTML cache to candidate-scrub instead of fetching all entries; `mget` batching of the two serial Redis reads in `getEntry`; consolidating the dual Mongo pools.

2026-08-22

- Diary lock is now **per-device and off by default**:
  - `app-shell.tsx` drives `isLockEnabled`/`hasPasscode` from the device (`withink_lock_enabled` localStorage flag + presence of `withink_encrypted_master_key`), defaulting OFF on a new device; the `showPinRebind` auto-bind flow was removed (a fresh device no longer auto-prompts/enables a PIN — it just uses the Diary Password).
  - `settings-shell.tsx` defaults the Diary Lock toggle from the device flag (not the account server value), so returning users' account lock state no longer flips a fresh device on. Enabling the lock now ALWAYS opens the PIN **setup** modal when this device has no bound PIN, and the "Change PIN" card only renders when a PIN actually exists on this device (was previously keyed off the account's `hasPasscode`, producing "Change PIN" with no PIN set).
  - `saveLockSettingsAction` no longer clears the account `passcodeHash` when disabling — disabling is per-device (the device removes its own PIN key locally), so other devices that still have the lock enabled keep working. Updated the lock-actions test to match.
  - Verified in the browser: fresh-device toggle is OFF, no "Change PIN" card, enabling opens the setup modal, and a fresh device gates behind the Diary Password screen (not the PIN). typecheck clean, lint 0 errors (3 pre-existing warnings), 120/120 tests, production build clean.

2026-08-22

- UI consistency: all four gate screens (`LockScreen`, `DiaryPasswordUnlockScreen`, `LockSetupOnboarding`, `MandatoryDiarySetup`) now render inside a shared `GateLayout` (`src/components/gate-layout.tsx`) that mirrors the auth pages — solid background, ruled ledger paper, `withink.` wordmark + tagline header above a login-style card (`bg-card`, `max-w-md`, `rounded-xl border p-6 sm:p-8`, `shadow-sm`). The screens' internal wordmark/pill headers were moved out of the card into the page header, and titles use the auth voice (`text-h2` + `text-caption uppercase`). `GateLayout` is `overflow-y-auto` with `m-auto` centering, so on short phone viewports the setup/lock screens scroll instead of clipping. Verified: typecheck clean, lint 0 errors (3 pre-existing warnings), lock tests 12/12, production build clean, visual pass on the lock gate in the browser.
- Note: re-seeded the `test@test.com` perf user (its lock settings had been flipped on by the device-bind flow during testing); the seed is now back to `isLockEnabled: false` so the account unlocks with the Diary Password only.

2026-08-19

- Shipped a performance pass across `apps/app` and `apps/docs`. All changes verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing `clearAllTimers` warnings, unchanged), 120/120 Vitest tests passing, production builds clean for both apps.
  - Instant PIN unlock: the 4-digit PIN path now verifies locally first by decrypting the per-device master key (Web Worker PBKDF2 + cached key, ~100-300ms) and reveals the diary immediately, then verifies the PIN against the server in the background. If the server rejects (PIN rotated on another device), `AppShell` rolls the session back via a new `onServerReject` path and routes to the Diary Password recovery view. Previously the unlock awaited a server round-trip (auth + lock-settings read + cookie set) before doing anything. `lock-change-modal`'s "verify current passcode" step uses the same local-first pattern.
  - Background sync is now incremental instead of a full scan on every tick: the 30s provider interval backed off to 120s, `getSyncList` is Redis-cached under the entries version key (was an uncached full Mongo scan), `syncDiaryCache` bails out early when the server sync-list fingerprint is unchanged and nothing is pending (skips the O(N) IndexedDB read + decrypt), and the entries page defers its mount sync with `requestIdleCallback` + a 5-minute session throttle.
  - Media lightbox no longer re-downloads and re-decrypts the whole journal on every open: entries are held in a session-scoped cache keyed by master key (5-min freshness) shared with the decrypted-HTML memo, and the fetch uses a new `getAllEntriesForMedia` projection that omits the bulky `contentJson` blob (deletes re-fetch full entries on demand). The cache is cleared on lock.
  - Insights client timezone refetch is now Redis-cached (`insights:action:{userId}:{today}:{tz}`, 300s) instead of recomputing the full O(N) aggregation on every call; the SSR `use cache` path is unchanged.
  - App-wide small wins: `use-lock-timer` replaced per-event timer re-arming (mousemove/scroll fire at 60Hz+) with a single 1s idle poll; the four lock/onboarding gate screens are `next/dynamic` (still SSR'd so the lock overlay stays in the initial HTML) so their motion/sonner/lucide JS leaves the shell bundle for everyone who doesn't need them; the unlock cookie is only re-slid once more than half the window has elapsed (was re-written on every autosave/list fetch); `filterLocalTimeline` searches a precomputed lowercase blob written at save time instead of lowercasing full text + building locale date strings per keystroke; ReactQueryDevtools is a dev-only dynamic import; the focus trap computes focusables once per activation instead of on every Tab.
  - Docs site: the hero now starts visible (`initial={false}`) so the LCP headline isn't blank until ~620KB of JS hydrates; Unsplash polaroids + lightbox converted from raw `<img>` to `next/image` (fill + lazy); the unused sonner `Toaster` was removed from the docs root (no docs page toasts). The `React.Suspense` boundaries around `AnimatePresence` were left in place — they are **required** by Next (AnimatePresence uses `Math.random()`, which needs a Suspense boundary above it during prerender; removing them fails the build).
  - Deferred (documented, not regressions): splitting the 1,376-line docs landing page into a server shell + client islands (high regression risk on a marketing page), forcing `/` to fully static (the `better-auth` session cookie is httpOnly, so the CTA can't detect the session client-side; PPR already bounds it), and font preloading (next/font already preloads by default).
  - Follow-up bug fix: the "Secure Your Diary" passcode screen could show the success toast and stay stuck after setting a passcode. Root cause: the four gate screens had been converted to `next/dynamic(..., { ssr: true })` in this sweep, and the dynamically-wrapped component could fail to unmount after the success handler flipped the parent state. Reverted those four gate screens (`LockSetupOnboarding`, `LockScreen`, `MandatoryDiarySetup`, `DiaryPasswordUnlockScreen`) to static imports in `app-shell.tsx`. Also removed the redundant second passcode screen (the `showPinSetup`/`pendingPin` re-prompt that appeared right after a successful first-time setup) and made `handlePinSetupSuccess` set `setIsUnlocked(true)`. Re-verified: typecheck clean, lint 0 errors (3 pre-existing warnings), 120/120 tests, production build clean.
  - Follow-up bug fix: the app asked for the passcode twice on first launch ("set → confirm → success → asked again"). Root cause: `handleSetupSuccess` set `hasPasscode`/`isLockEnabled` to `true` unconditionally, which made the `showPinRebind` effect fire at the same time as the first-launch `showSetupPrompt`; because `showPinRebind` is an early return it showed first, and after it dismissed the still-true `showSetupPrompt` rendered a second screen. Fix: `handleSetupSuccess` now sets `setIsLockEnabled(!!pin)` / `setHasPasscode(!!pin)`, and the `showPinRebind` computation is gated on `!showSetupPrompt` (with `showSetupPrompt` added to its deps) so the two first-setup prompts are mutually exclusive. Re-verified: typecheck clean, lint 0 errors (3 pre-existing warnings), lock tests 12/12, production build clean.

2026-08-15

- Completed a full performance sweep of `apps/app` (interaction latency + navigation latency) and fixed a zero-knowledge local-search bug. All changes verified: `tsc --noEmit` clean, eslint 0 errors (3 pre-existing `clearAllTimers` exhaustive-deps warnings, unchanged), 112/112 Vitest tests passing, production build clean. `/insights`, `/media`, `/entries`, `/settings` now render as Partial Prerender (`◐`) instead of fully dynamic.
  - Writing path (instant typing): `tiptap-editor` now debounces the full-document snapshot (getHTML/getText/getJSON) to a 400ms trailing flush (was 3 serializations per keystroke) with flush-on-blur, and is `memo`-wrapped; `use-auto-save` drops the per-keystroke `JSON.stringify` dirty-check (compares string fields instead); editor-shell scroll + visualViewport handlers are rAF-throttled and the scroll-padding `<style>` element is created once; the toolbar's word-count subscription is split from the button grid.
  - Navigation / server hot paths: `(app)/layout.tsx` dedupes the lock-settings read (passes pre-fetched settings into `isSessionUnlocked`) and parallelizes the encryption-settings read, which is now Redis-cached (60s TTL + invalidation on save). Insights are cached via `use cache` + `cacheTag("insights:{userId}")` (`insights-cache.ts`), invalidated by `revalidateTag` on every entry write; SSR reads the client timezone cookie so the timezone-adjusted client recompute is a rare fallback. The entries page derives its date list from one calendar call.
  - Search: the legacy (non-encrypted) search path is pushed down to Mongo (`$regex` on title/contentText/ISO date with projection + pagination) instead of pulling the whole collection to filter in JS. Zero-knowledge search now matches the FULL entry text: the local IndexedDB metadata cache stores full `contentText` (was a 240-char snippet) with a `v: 2` marker and a one-time re-sync trigger for existing browsers; human-readable date matching ("Jul 1") restored in `filterLocalTimeline` (new pure, unit-tested helper); the decrypted timeline is cached in memory per unlock and cleared on lock, so searches are instant after the first.
  - Media: R2 listings are paginated past the 1,000-object cap (`lib/r2-list.ts` — gallery, stats, account deletion); the media page server-feeds the gallery (single R2 listing + combined refresh action); the lightbox memoizes per-entry decryption (no O(N) decrypt per prev/next) and `findEntryForMediaAction` is bounded to the 200 most recent entries.
  - Data layer: `saveEntry` uses the `INCR` return value (one fewer Redis round trip); the client-encryption migration uses `bulkWrite` (was N+1 `updateOne`); the feedback email is fire-and-forget after the DB write (record is the source of truth); flashback history/selection cache writes are non-blocking.
  - Bundle/client: `jszip` is dynamic-imported (was eager on the settings page), ReactQueryDevtools is dev-only, the sidebar collapse animates width via native CSS (no JS spring), the insights heatmap replaces ~365 Radix tooltips with native `title` attributes, `EncryptionProvider` context value is memoized and its 30s background sync pauses when the tab is hidden, and the timeline's background-sync progress is throttled with the per-item `layout` animation removed.
  - Dashboard: the above-the-fold hero (yesterday banner, today's card, streak note) now streams behind its own Suspense boundary (`DashboardHero`) so the page header paints instantly.

2026-08-13

- Shipped local-first journal saving with background cloud sync (WhatsApp-style): the editor write path no longer blocks on the cloud.
  - Save flow: `use-auto-save` now encrypts, writes to the encrypted IndexedDB store (`document_cache` + `metadata_cache`), enqueues a per-date pending sync, marks the date pending, and returns `"saved"` instantly — the server round-trip no longer gates the save (`use-auto-save.ts` `persist()`). The legacy no-encryption network-save path (with retry/backoff and pagehide flush) is preserved unchanged.
  - New `JournalSyncService` (singleton + class export) runs a coalesced, single-flight reconcile loop: push pending queue → pull remote changes. Triggers: after each local save (push-only), on unlock, `online`, tab-visible, and a 30s interval. Offline runs drop queued work (no busy-loop) and re-trigger when online.
  - Pull guard fix: `syncDiaryCache` now never overwrites or prunes a locally-pending date (previously a pending local edit could be clobbered by a pull whenever timestamps differed). Conflict resolution is last-write-wins by `updatedAt`; pending local edits always push.
  - `flushOfflineSyncQueue` now returns `{ succeeded, failed }` outcomes; local store writes (`saveLocalDocument`/`saveLocalMetadata`/`enqueueOfflineSync`) propagate errors so a failed local write surfaces as a save error instead of silently losing the entry.
  - Sync visibility: `useSyncStatus(date)` (via `useSyncExternalStore` on the service) drives `SaveIndicator` — "Saved · Synced" when the cloud is up to date, "Saved locally · Syncing" while a push is pending. `withink_last_synced` timestamp tracked in localStorage.
  - Verification: focused journal tests 25/25, full suite 113/113, `tsc --noEmit` clean, `eslint` 0 errors (3 pre-existing `clearAllTimers` exhaustive-deps warnings, unchanged from HEAD), production build clean (21 routes).
  - Branch: `redesign/field-ledger-app`.

2026-08-13

- Shipped the Annotated Codex surface redesign for `apps/app` (theming intact):
  - New shell: chrome becomes marginalia. A narrow left margin rail (wordmark + Caveat date + folio-numeral index 01 Today → 07 Feedback in tracked uppercase + colophon with ThemeToggle and user) is ruled from the text block by a 1px hairline, replacing the old sidebar-panel + breadcrumb-bar + card-grid app shell. Desktop breadcrumb bar removed; a slim mobile-only header (menu + wordmark + theme) replaces it, with the full folio rail sliding in as a drawer.
  - Page headers: every surface now opens with a printed running head (folio name in tracked caps, hand-set date) ruled above the serif title + gold italic accent. New `PageHeader` `runningHead`/`description` API; loading skeletons mirror it.
  - Surfaces as pages: dashboard is "today's page" (2px gold gradient hairline on the reflection sheet; streak becomes a flat "Margin note" with hand caption); insights' four icon-tile stat cards became one hairline-separated at-a-glance passage; entries calendar metrics flattened to a folio row.
  - Primitives: `@withink/ui/card` now rests flat (no `shadow-sm` at rest; interactive cards still lift); labels normalized to the 0.2em running-head / 0.16em label voices.
  - Direction: surface-structure roll (seed `be2a53bd`, candidate 4 — The Annotated Codex) inside the pinned Field Ledger world; contract comment written into `apps/app/src/app/layout.tsx` and verified to survive the production build.
  - Verification: `tsc --noEmit` clean, eslint clean on all touched files, Impeccable detector clean, production build succeeds (21 routes), desktop + mobile visual pass on dashboard/entries/insights/settings/media/flashbacks/editor.
  - Branch: `redesign/field-ledger-app` (polish commit `a48c0af`; redesign work uncommitted at write time).

2026-08-10

- Migrated the repository to a proper Turborepo monorepo:
  - Restructure: moved the two previously-independent apps into `apps/app` (`@withink/app`) and `apps/docs` (`@withink/docs`); created a single root `pnpm-workspace.yaml` (with pnpm version catalog + `onlyBuiltDependencies` allowlist), root lockfile, root `turbo.json` (build/dev/lint/typecheck/test/format tasks with env-aware build caching), `.nvmrc` (Node 24.11.1 pin for the c-ares fix), consolidated root `.gitignore`, and a shared root Prettier config (pinned to 3.4.2 to match existing formatting).
  - Shared packages: extracted the actual cross-app duplication into `packages/` — `@withink/ui` (Button, Card, Input, Textarea, Skeleton, Tooltip, BrandLoader, ThemeToggle), `@withink/theme` (ThemeProvider + cross-tab cookie sync), `@withink/tokens` (canonical design-token CSS layer), `@withink/utils` (`cn`), `@withink/config` (`siteConfig`), plus `@withink/typescript-config` and `@withink/eslint-config`. Packages ship as source and are consumed via `transpilePackages` + `@source` Tailwind directives; shadcn `components.json` now targets the packages.
  - Deliberately kept the data layer (Mongoose models, repositories, R2, Resend, Better Auth) app-local; `packages/*` glob leaves room for `@withink/database`, `@withink/email`, etc. in a future phase.
  - Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`): install → lint → test → build → typecheck → format:check.
  - Verification: root `pnpm lint` (0 errors), `pnpm typecheck` clean across all packages/apps, full Vitest suite 100/100 passing, production builds succeed for `@withink/app` (21 routes + proxy) and `@withink/docs` (7 routes), `pnpm format:check` clean.

2026-08-02

- Resolved MongoDB `querySrv ECONNREFUSED` (machine-level, NOT code): Root cause proven to be a c-ares 1.34.6 regression in Node ≥ v24.13.0 that fails to read Windows DNS servers (GetAdaptersAddresses) and hard-falls back to `127.0.0.1`, breaking all `dns.resolveSrv()` / `mongodb+srv://` connections. Verified via raw `GetAdaptersAddresses` probe (WARP's `127.0.2.2/127.0.2.3` were present and correct) and upstream issues (nodejs#62748, c-ares#1140). Fixed by downgrading Node v24.18.0 → v24.11.1 (bundles c-ares 1.34.5). Confirmed: `dns.getServers()` → `["127.0.0.2","127.0.0.3"]`, SRV resolves, MongoDB connects, app typecheck/lint/tests (99/99) and dev server all green. Do NOT upgrade Node past v24.12 until Node ships a c-ares 1.34.6 DNS fix.

- Completed Production-Grade Security & Housekeeping Remediation (Tiers 0–6):
  - Autosave & Offline Reliability: Rewrote `use-auto-save` with single-flight saves, retry, offline queue, and convergence dedupe; added 8 unit tests; offline edits re-sync on unlock. Service worker (`sw.js`) now handles offline navigation with a branded `offline.html`.
  - Zero-Knowledge Server: Removed all server-side decryption of user entry content; encryption keys live only in the browser. Server retains `safeDecrypt`/`decrypt` solely for the lock session token and legacy plaintext migration. Media list/lightbox scrub user content client-side.
  - Diary Lock Hardening: Single SSR lock gate in `(app)/layout.tsx` (`DiaryLockGate`) covers all nested pages; `getAllEntriesAction` and `/api/media/upload` return locked errors/403 when locked. Passcode verification uses `timingSafeEqual`; reset codes use `crypto.randomInt`; reset-email requests rate-limited (3/15 min); hex validation added to crypto client and worker.
  - CSP Hardening (both apps): `script-src 'unsafe-eval'` dev-only, added `script-src-attr 'none'` and `object-src 'none'`.
  - App Shell & UX Fixes: Fixed `app-shell` ref-during-render (state-adjust-during-render pattern), `save-indicator` setState-in-effect, `media-lightbox` stale-cache-on-open, `journal-editor-shell` cross-date stale content, and removed `as any` casts in theme/audio files. Lint now 0 errors / 1 warning (intentional EB Garamond font link).
  - Dependency Hygiene: Removed bogus `save-dev` (0.0.1-security) placeholder from `app/` and `docs/` package.json; declared `server-only` (used by 14+ server files) as an explicit dependency; pruned ~20 unused app-only dependencies from `docs/package.json` (docs site now installs only its ~10 real packages).
  - Verification: Typecheck clean, lint clean (docs) / 0 errors + 1 font warning (app), full Vitest suite 99/99 passing, production builds succeed for both `app` (21 routes) and `docs` (7 routes).

2026-07-11

- Restructured Repository for Subdomain Routing Topology:
  - Repository scope split: Separated application code into `app/` (serving `app.withink.me` dashboard) and `docs/` (serving `withink.me` public marketing/legal pages).
  - Directory rename: Renamed internal engineering markdown docs from `docs/` to `internal-docs/`. Deleted old `old/` directory.
  - Subdomain routing: Shifted `/dashboard` to `/` in the dashboard app, removed public route templates from the app project, and updated all hardcoded references/links.
  - Wildcard cookies: Integrated `.withink.me` wildcard domain cookies in Better Auth config for production subdomain session sharing.
  - Public Contact Us page: Created a brand new, serene Contact Us page with form support and email utilities under `/contact` in the public site.
  - Verification: Clean TypeScript compilation and successful production builds completed for both projects, with the full Vitest suite (91/91 tests) passing cleanly.

2026-07-10

- Shipped Diary Lock (Diary Passcode Lock):
  - Secondary Security Layer: Designed and implemented a local passcode (PIN) lock that intercepts client-side UI and server-side actions, protecting entries, media, flashbacks, insights, and ZIP downloads even if login credentials are known.
  - Tactile Keypad Overlay: Built a fullscreen backdrop-blurred PIN keypad overlay with tactile animations, automatic submission, keyboard listeners, error shaking, and multi-path lock recoveries (login credentials check and Resend email codes).
  - Onboarding Flow: Added a passcode setup onboarding dialog prompting users on login to secure their diary if they haven't set up a passcode.
  - Configuration Settings: Integrated a Diary Lock section card in Settings to allow toggling locks, changing PINs, customizing auto-lock timeouts, and setting tab-switching locks.
  - Test Suite Expansion: Expanded the Vitest suite with 12 new unit tests covering lock settings, cookie verification, recovers, and setting validations. All 91 unit tests are passing cleanly.

2026-07-06

- Completed Phase 18 Final Polish:
  - Typography Polish: Replaced heavy `font-black` headings with design-system standard `font-bold` (700) for display/hero headings and `font-semibold` (600) for card titles, improving readability and editorial warmth.
  - Theme Toggle Relocation: Placed the `ThemeToggle` component in the main top header for all viewports, ensuring theme switching is always accessible even when the sidebar is collapsed on desktop. Removed redundant toggle elements from the sidebar.
  - Landing Page Copy: Replaced "Begin Rebuilding" CTA with "Get Started". Updated the tactile mockup preview card with warm, poetic journal entry descriptions of tea/rain/nature and a "Calm 😌" mood tag to align with emotional diary goals.
  - Legal Pages Styling: Aligned Terms of Service and Privacy Philosophy pages to use standard design-system typography classes (`text-h1`, `text-title`, `text-body-small`).
  - Baseline Test Fixes: Resolved a failing unit test in `entry-actions.test.ts` where MongoDB `_id` was being asserted instead of client-mapped decrypted entry `id`.

2026-07-06

- Completed Phase 17 Production Readiness:
  - SEO & Metadata: Configured comprehensive titles and metadata on 14 pages (Home, Login, Register, Forgot Password, Reset Password, Verified, Dashboard, Entries, Entry Detail, Flashbacks, Insights, Media, Feedback, Settings) and added `/entries/` route block to crawler disallow lists in `robots.ts`.
  - Security Headers: Configured `next.config.ts` to return Content-Security-Policy (CSP) allowing `'self'`, Google OAuth avatars, and R2 bucket assets, Strict-Transport-Security (HSTS) with subdomains and preload support, and X-XSS-Protection.
  - Logging Consolidation: Replaced raw `console.error` with our redaction-safe structured `logger` inside database, cache, auth, and actions adapter boundaries.
  - Client-Server Error Gateways: Created `/api/monitoring/errors` to intercept client-side exceptions and report them to the server log.
  - Web Vitals Tracking: Created `<WebVitals />` tracking component and `/api/monitoring/web-vitals` to log core web performance ratings.

2026-07-06

- Email Verification & Welcome Email Hook:
  - Welcome Email trigger: Added the `afterEmailVerification` callback within Better Auth's config in [auth.ts](file:///d:/code/saas/temp/withink.me/src/lib/auth.ts). When a user registers using email and password, their verification status is initially pending (`emailVerified = false`). Once they click the verification link in their email, this hook fires to dispatch the Welcome Email (mirroring the immediate Welcome Email sent to Google OAuth users).

2026-07-06

- Completed Phase 16 Testing:
  - Custom React Hooks: Created comprehensive unit tests for `useFocusTrap` (verifying auto-focus, focus wrapping within bounds on Tab/Shift+Tab, and restoring focus to parent trigger elements upon deactivation/unmount) and `useDebounce` (asserting value delay intervals and timer clears).
  - Server Actions: Added extensive unit/integration tests for server-side endpoints:
    - Auth Action: Tested database client connection and user lookup checks (`checkIdentityExists`) with lowercased normalization.
    - Insights Action: Verified session protection and retrieval of analytics payload from the service layer.
    - Journal Entry Actions: Covered entries retrieve, CRUD operations, date firewall checks, and streak calculation edge cases.
    - Media Actions: Tested storage stats computation, secure bucket listing, ownership checks, and deep scrubbing of deleted media URLs within MongoDB HTML and Tiptap JSON structures.
  - Verification: Completed test suite execution successfully, with 79/79 tests across 14 test files passing cleanly, and verified build stability.

2026-07-06

- Feedback and Journal Autosave Reliability Fixes:
  - Feedback Page Width: Aligned the feedback page width from `max-w-3xl` to `max-w-5xl` in [page.tsx](file:///d:/code/saas/temp/withink.me/src/app/(app)/feedback/page.tsx), standardizing layout dimensions across all diary dashboard routes.
  - Journal Autosave Bug: Resolved the "Save failed" issue in red. First, implemented client-side date-synchronization via `withink-local-date` cookie in [app-shell.tsx](file:///d:/code/saas/temp/withink.me/src/features/app-shell/components/app-shell.tsx) to keep Server Components and Server Actions aligned on the user's actual browser local date. Second, modified the `useAutoSave` hook in [use-auto-save.ts](file:///d:/code/saas/temp/withink.me/src/features/journal/hooks/use-auto-save.ts) to reset baseline states synchronously when the date changes, preventing dirty state race conditions and incorrect expired/future grace period evaluations.
  - Editor Toolbar TypeError: Fixed a transient runtime `TypeError` (`Cannot read properties of null (reading 'can')`) in [editor-toolbar.tsx](file:///d:/code/saas/temp/withink.me/src/features/journal/components/editor/editor-toolbar.tsx) by adding a defensive guard clause checking for editor presence inside the `useEditorState` selector before reading capabilities.

2026-07-06

- Completed Phase 15 Accessibility.
- Focus Management: Created a reusable `useFocusTrap` hook to wrap focus inside modal dialogs and sliding panels (Media Lightbox, Delete Account Modal, and Mobile Sidebar drawer), and added `Escape` key close handlers to them. Added a visually hidden-until-focused "Skip to content" link at the top of the App Layout page targeting the main body.
- ARIA semantics and labels: Added `role="dialog" aria-modal="true"` to lightbox, mobile sidebar, and settings delete account modal. Associated error message elements to inputs via `aria-describedby` in all auth and feedback forms. Added descriptive `aria-label`s to show/hide password buttons, the journal editor title/back actions, entries search/filters/pagination inputs, and month calendar buttons/day cells.
- Visual Focus Indicators: Added focus-visible outline indicators (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) to custom buttons and cards in settings (theme selects, avatar upload) and feedback form categories, ensuring keyboard navigability is visually traceable.
- Layout Alignment: Standardized the Feedback page width constraint from `max-w-3xl` to `max-w-5xl` in `feedback/page.tsx`, bringing visual symmetry with all other diary dashboard pages.
- Verification: TypeScript typecheck clean, ESLint linting clean (zero errors/warnings), Vitest unit test suite (43/43 tests passing), and production next build (22 routes with PPR stream support) successfully completed.

2026-07-06

- Completed Phase 14 Performance.
- Build stability: the production `next build` was crashing during "Collecting page data" with a V8 `Fatal process out of memory: Zone` on this Windows machine (exit `0xC0000409`), even with `serverMinification: false`. Root cause was the page-data worker pool (Next.js defaulted to 15 workers) exhausting the default ~1.5 GB heap. Verified the fix by capping concurrency to 4 and lifting the heap to 4 GB. Rather than baking POSIX-style `NODE_OPTIONS=...` env prefixes into the `build` npm script (which only parses under POSIX shells and breaks under `cmd.exe`), added a portable zero-dependency Node build driver `scripts/build.mjs` that sets `NODE_OPTIONS`/`NEXT_WORKER_CONCURRENCY` before spawning `next build --webpack` with inherited stdio — works identically across shells. The `build` script now runs `node scripts/build.mjs`.
- Dynamic imports / bundle splitting (the phase's deliverable): converted the three heaviest client graphs to `next/dynamic` so first paint is no longer blocked by their chunks. (1) The entries editor (`/entries/[date]`) now lazy-loads `JournalEditorShell` (`ssr: true`) with an `EditorSkeleton` fallback that mirrors the route's `loading.tsx`; the grace-period firewall branch (future/expired dates, which never render the editor) no longer pulls the Tiptap chunk into the route's client bundle. (2) The Insights dashboard lazy-loads a new `InsightsCharts` wrapper (`ssr: true`) bundling the heatmap, mood/word charts, activity summaries, and monthly overview — the header and four stat cards above the fold render immediately, the SVG-heavy charts stream in after, with a matching `InsightsChartsSkeleton` placeholder. (3) The media gallery's full-screen lightbox is extracted into `MediaLightbox` and lazy-loaded (`ssr: false`), so it only enters the bundle when a thumbnail is actually opened; deleted lightbox internals from the gallery by passing `files`/`index`/`onClose`/`onPrev`/`onNext`/`onDeleted` props. No behavior changes — pure code-splitting.
- Image optimization: audited all four raw `<img>` tags in the repo. Converted the two that represent content UI — the feedback screenshot preview (`feedback-form.tsx`) and the settings avatar (`settings-shell.tsx`, fixed 80 px circular, `fill`/`sizes="80px"`) — to `next/image`. Intentionally left the other two as raw `<img>`: the feedback email template (`next/image` does not render in email HTML) and the Google favicon companion icon (a tiny external icon that needs a new `remotePatterns` host and gains nothing from optimization). Both converted hosts (`R2_PUBLIC_HOST`, `lh3.googleusercontent.com`) were already in `next.config.ts` `remotePatterns`.
- Redis optimization: collapsed the fixed-window rate limiter (`src/server/rate-limit.ts`) from three sequential Redis round-trips (`incr` → conditional `expire` → `ttl`) to a single pipelined round-trip via `redis.pipeline().incr().expire().ttl().exec<[number,number,number]>()` (verified against installed `@upstash/redis@1.38.0`). Always sets `expire` — not only on `count === 1` — which also fixes a latent race where a worker crash between `incr` and `expire` left a counter that never expired. The fail-open contract is preserved exactly (Redis null or `exec` rejection → allowed). Updated `rate-limit.test.ts` to assert one pipeline `exec`, added a TTL-fallback case; suite is now 43 tests.
- Query optimization: added a compound index `{ userId: 1, date: -1 }` to the `Entry` schema alongside the existing `{ userId: 1, date: 1 } unique` index. The hot sorted-read paths (`getEntriesPage`, `getEntryDates`, and any `sort({ date: -1 })` listing) now hit the index instead of an in-memory sort. Kept the asc index for ascending reads (insights full scan, export). Deliberately did **not** add a `{ userId, mood }` index — mood-filtered search decrypts in-app in `JournalService.getInsights`, so DB-side mood selectivity doesn't pay off (architecture: "Only optimize proven bottlenecks").
- Cache review: the version-based invalidation (`entries:{userId}:version` incremented on save/delete, with `:v{version}:` keyed entries/pages/stats/dates) and the hot/archive TTL split are correct and degrade gracefully when Redis is absent — no changes. Noted one maintainability nit (see Technical Debt): `CACHE_KEYS` constants are declared but the repository uses ad-hoc string keys; left untouched because consolidating key builders risks churning working invalidation for no perf gain.
- Core Web Vitals / rerender review: React Compiler is on (`reactCompiler: true`) and handles memoization; spot-checked `MediaGallery` (inline filter/sort acceptable at this dataset size, React Compiler memoizes downstream; the real win was the lightbox split), `InsightsDashboard` (the single client-side timezone re-fetch via `getInsightsAction` is correct and runs once), and confirmed no `Date.now()`/`Math.random()` in component render paths. No rerender bugs found — "reviewed, no action."
- Verification: TypeScript clean, ESLint clean (zero warnings), all 43 unit tests pass. Production build (`pnpm build` → `node scripts/build.mjs`) completes clean: 22 routes generated, all diary routes (`/dashboard`, `/entries`, `/entries/[date]`, `/feedback`, `/flashbacks`, `/insights`, `/media`, `/settings`) registered as Partial Prerender (`◐`), page-data collection finished in 6.4s with no OOM.

2026-07-05

- Completed Phase 13 Feedback (user ↔ team communication channel).
- Created a new `features/feedback/` module: a shared Zod `feedbackSchema` (shared client/server), a Mongoose `FeedbackModel` (userId, email, category, subject, message, imageUrl?, status, timestamps), `FeedbackRepository.create()` for persistence only, and `FeedbackService.submit()` for persist + best-effort team email notification.
- Preserved V1's two categories ("issue" / "feedback") as `bug` and `general`, and added `idea` as a natural home for feature requests. The client form renders a calm segmented category picker (Bug / Idea / General) using the design-system aesthetic.
- Team email is sent via the existing Resend client to `CONTACT_EMAIL`, rendered as an inline-styled `FeedbackNotification` JSX template matching the `verify-email` pattern. Email is strictly best-effort: persistence succeeds regardless — send failures are caught and logged and never block the user, consistent with `auth.ts`.
- Reused the existing `/api/media/upload` presigned route for screenshots with `folder: "feedback"` (already maps to the secure `system/{userId}/feedback/` path) — no new upload route, no new library.
- Secured the submission with `submitFeedbackAction`: Better Auth session required, server-side Zod re-validation (never trusts the client), and a first-party ownership check on `imageUrl` — when present it must start with `${R2_PUBLIC_URL}/` and contain the caller's own `system/{userId}/feedback/` prefix (no arbitrary/SSRF URLs in the record or email).
- Added a reusable fixed-window rate limiter in `src/server/rate-limit.ts` keyed on `feedback:{userId}` (5 / hour), backed by the existing Redis client with `INCR` + `EXPIRE`. It degrades gracefully — if Redis is absent or errors, the request is allowed through and the failure is logged — so legitimate users are never blocked by our own infrastructure. Reusable for auth/uploads later without a new dependency (chose this over `@upstash/ratelimit` per the "avoid new libraries" rule).
- Added a reusable design-system `Textarea` primitive in `src/components/ui/textarea.tsx` mirroring `Input` styling, and a `FEEDBACK` block in `constants/limits.ts` (subject/message min-max, rate-limit window/max).
- Converted `/feedback` to a server component with the standard auth redirect (like `/settings`), kept the sibling-consistent page header, and renders `<FeedbackForm />` in a calm centered column. The form supports inline validation, screenshot upload with thumbnail preview + remove, toasts on error, and a success confirmation card ("Thank you" + "Send another" / "Back to Today"). Used `useWatch` over `watch()` to stay React-Compiler-clean.
- Added `feedback-service.test.ts` (persist + best-effort email, email-failure tolerance) and `rate-limit.test.ts`. TypeScript, ESLint (zero warnings), all 42 unit tests, and the production build are clean; `/feedback` registers as a Partial Prerender route.

2026-07-04

- Completed Phase 12 Export (data ownership).
- Created a new `features/export/` module. Added `ExportService.generateExportZip(userId)` which builds a complete ZIP backup with `jszip`: a `README.txt`, a clean `metadata.json` (date, title, mood, wordCount, timestamps — no encrypted blobs or rendered HTML), plain-text `entries/{year}/{Month}/{date}.txt`, formatted `entries/{year}/{Month}/{date}.html`, and an `images/` folder.
- Improved on the V1 export: images are retrieved securely from R2 by deriving the object key from `R2_PUBLIC_URL` and calling `GetObjectCommand` (first-party assets only — no arbitrary URL fetching / SSRF), images are deduped, and a single unreadable image never fails the whole export.
- Delivered the download via a streaming route handler `GET /api/export` (auth-guarded, 401 when unauthenticated, `Content-Disposition` attachment with a dated filename). Binary downloads belong in a route handler, not a Server Action.
- Added data-access helpers reused from the journal feature: `EntryRepository.getAllEntries` (uncached, complete, chronological) and `JournalService.getAllEntriesForExport` (decrypts via the existing private `decryptEntry`, keeping decryption centralized).
- Surfaced the entry point as a self-contained "Your data" section (`DataExportCard`) inside the redesigned Settings page, matching the diary section-card styling; the design-system sidebar lists no Export item and the old app also placed export under Settings.
- Added 5 unit tests (32 total passing) covering archive structure, clean metadata, first-party-only image capture, dedupe, the empty-journal case, and graceful handling of an unreadable image. TypeScript, ESLint, and the production build are all clean; `/api/export` is registered.

2026-07-03

- Replaced the single generic root `loading.tsx` (a centered writing-card skeleton shown for every route) with per-route `loading.tsx` skeletons that mirror each page's real layout, so the loading state now represents the page instead of one uniform placeholder.
- Added faithful skeletons for Dashboard (2+1 top grid, 2-col bottom grid), Entries (calendar grid + timeline list), Entry editor (title, mood/metadata bar, writing lines), Insights (4 stat cards, heatmap, chart cards), Flashbacks (letter card), Media (storage bar, controls, image grid), and Settings (single column of section cards). Feedback is static and needs none; the root `loading.tsx` remains a fallback for auth/public routes.
- Extracted `PageLoadingShell` and `PageLoadingHeader` helpers into `features/app-shell/components/page-loading.tsx` so skeletons reuse the exact container width and render each page's real eyebrow + serif headline immediately, skeletoning only the data-dependent regions.
- Also fixed the Settings shell to fill the standard `max-w-5xl` page width (it was constrained to `max-w-2xl`, making it look narrower than sibling pages).
- Verified: TypeScript, ESLint, all 27 unit tests, and the production build are clean.

2026-07-03

- Redesigned the Phase 11 Settings interface. The first build had inadvertently reproduced Version 1's cramped visual language (7–10px mono uppercase micro-labels, `font-black tracking-tighter` headings, dense two-column "binder spread"), so the page looked identical to the old app and violated the Design System's calls for warmth, calm, and generous spacing.
- Rebuilt `SettingsShell` as a single, calm centered column of paper-like section cards (Profile, Appearance, Paper Feel, Security, Connected Accounts, Sign out, Delete account). Adopted the semantic type scale (`text-h3`, `text-title`, `text-body-small`, `text-caption`) and design tokens instead of hardcoded hex colors and pixel font sizes.
- Each section now leads with an icon + serif title + quiet description, with comfortable spacing between controls. Theme selection uses larger Sand/Moon cards with sun/moon glyphs; Paper Feel keeps the scale slider, auto-detect, PPI calculator, and credit-card calibration but with roomier, gentler styling; Connected Accounts uses a clean list with Connected/Not connected badges; the delete confirmation modal was softened to match the diary aesthetic.
- Preserved all existing behavior and server logic unchanged: `deleteAccountAction`, avatar upload flow, `changePassword`, paper-scale persistence, and the type-to-confirm "DELETE" deletion. All 27 unit tests still pass; TypeScript, ESLint, and the production build are clean.

2026-07-02

- Completed Phase 11 Settings.
- Designed and built a destructive server action `deleteAccountAction` to securely delete user profiles, purge all encrypted journal entries from MongoDB, drop R2 storage contents (journal attachments and avatar uploads), invalidate Redis cache entries, and delete Better Auth records (user, session, account).
- Developed the client-side `SettingsShell` with dedicated tabs for Profile (name/email and direct R2 avatar upload), Appearance (Sand Light and Moon Dark cards), Paper Feel (visual scale slider, auto-detect device dimensions, diagonal screen PPI calculator, and interactive credit card drag calibration supporting mouse/touch events), Security (Zod-validated change password forms), and Connected Accounts.
- Secured the settings page route at `/settings` with server-side authentication redirect checks.
- Wrote extensive unit tests verifying account deletion workflows, cache invalidation, and R2 delete commands.
- Verified that the workspace complies with TS/ESLint rules and successfully compiled the production build.

2026-07-02

- Completed Phase 10 Insights.
- Designed and built a dedicated `InsightsService` that retrieves unencrypted metadata (date, wordCount, mood, createdAt) for entries on the database level, computing streaks and analytics without decryption overhead.
- Implemented robust streak calculations returning the current daily writing streak and longest writing streak.
- Created a 365-day calendar heatmap rendering entry details, shaded by word count volume, utilizing Radix UI tooltips, and padded with spacers to align week days correctly.
- Created mood distribution summaries and charted average mood trends over the past 6 months using responsive SVG line graphs.
- Modeled monthly average word count volumes using responsive SVG bar charts.
- Categorized weekly and diurnal activity patterns (active days of the week, writing times by timezone-offset adjusted hours).
- Drafted a selector-based monthly overview card filtering entries, words, and mood distributions.
- Mounted the dashboard at `/insights` route, checked all TypeScript types, ESLint rules, and successfully finalized production builds.

2026-07-02

- Completed Phase 9 Flashbacks.
- Designed and implemented a dedicated `FlashbackService` and server actions that retrieve today's flashback.
- Implemented prioritization of anniversary memories (e.g. exactly 1 year ago today, or past years) with automatic fallbacks to random historical entries older than yesterday.
- Added Redis caching (24-hour TTL) of the day's chosen flashback to ensure perfect consistency across the dashboard and flashbacks pages.
- Built a robust history-tracking mechanism in Redis to store the last 10 unique shown flashback dates, avoiding repetitive flashbacks.
- Created a refresh action to force-select a new flashback and update the cache seamlessly.
- Crafted a premium client UI using the Diary design system, with concentric circular outline backgrounds, detailed mood tone styling, and action triggers for responding or re-reading.
- Developed comprehensive unit tests verifying anniversary priorities, random exclusions, cache checks, and refresh operations, ensuring clean TypeScript compiler and ESLint audits.

2026-07-02

- Completed Phase 8 Search.
- Re-architected search to decrypt and query journal entry contents on the server-side to bypass database-level query limitations on encrypted AES-256-GCM payloads.
- Implemented robust case-insensitive matching across entry titles, full-text bodies, and localized date variations (ISO dates, short-month, and long-month formats).
- Built a front-end `<Highlight>` text renderer in the timeline that splits matched strings and renders highlights cleanly inside titles and snippet excerpts.
- Designed a smart text excerpt/snippet extractor `getSnippet` that centers matches from the body content.
- Created extensive unit tests verifying exact keyword, date format, and paginated search behavior.
- Cleaned all type checks, ESLint rules, and Next.js production builds with zero warnings or errors.

2026-07-01

- Completed Phase 7 Media Integration.
- Integrated Cloudflare R2 bucket connectivity with presigned URLs API endpoint at `/api/media/upload` supporting authorized uploads capped at 5MB (jpeg, webp, png, gif).
- Developed server actions inside `media-actions.ts` for listing, deleting, fetching storage stats, and checking which journal entry owns a media asset.
- Implemented deep-scrubbing of user entries upon media deletion, scanning encrypted journal entries (HTML and Tiptap JSON content nodes) to remove matching image references, re-encrypting, and invalidating user entry cache.
- Built a premium memory gallery page `/media` featuring a modern storage bar dashboard, responsive grid/list views, sort/search controls, and an interactive lightbox preview.
- Completed all type checks, lint checks, and Next.js production builds with zero warnings or errors.

2026-07-01

- Implemented the complete Journal Entries timeline index view supporting real-time debounced title search, mood and time-range filters, and standard pagination.
- Designed a beautiful, responsive monthly calendar component matching the dark/light diary theme, highlighting written dates and supporting visual navigation.
- Created Server Actions for entries pagination, consistency statistics, calendar highlights, and secure entry deletion.
- Integrated consistency metrics (total reflections count, current daily streak, average words) dynamically updating when journal logs are deleted.
- Connected the V2 app dashboard to live data loaders replacing static placeholders, including recent reflections list and dynamic flashbacks (prioritizing 1-year anniversaries).
- Resolved Next.js typed routes compiler constraints by using type-safe Link href and router push parameter castings.
- Resolved React 19 compiler impurities by isolating math-random logic to regular service-layer helpers outside React components.
- Verified zero TypeScript compilation warnings and zero ESLint rule violations across all new features.


- Built out the V2 Journal Editor feature module (Phase 5) utilizing Server Actions, Mongoose persistence schemas, and debounced autosaving with Upstash Redis cache version invalidation.
- Implemented the Tiptap rich-text editor components with a visual viewport keyboard-avoidance listener and support for file drop/paste base64 encoding fallbacks.
- Developed custom mood selector and save indicator components styled according to the premium dark/light Design System.
- Incorporated a date validation and grace-period creation firewall protecting entries routing.

- Integrated a semantic typography type scale (.text-display, .text-hero, .text-h1, etc.) into the CSS and Tailwind environment as utility directives.
- Polished the theme switching experience with smooth, synchronous 200ms background/color transitions on all interface containers and layout tags.
- Built refined, standardized UI components (Inputs, Buttons, and Cards with support for interactive hover-scaling variants).
- Updated Landing and App-Shell routes (Dashboard, Entries, Feedback, Flashbacks, Insights, Media, Settings) to fully respect the spacing guidelines and the new typography system.
- Replaced inline sidebar stub on dashboard with a dynamic, unified `AppShell` feature module containing a collapsible Sidebar (with custom React popover user profile menu) and a dynamic breadcrumbs Header.
- Restructured route group layouts to fetch the user session on the server side and pass the user details to client-side layout primitives.
- Cleansed ESLint linter errors and TypeScript compiler warnings for all layout, dashboard, and header components.
- Confirmed Next.js 16 / React 19 / Tailwind CSS v4 stack.
- Deployed cached MongoClient, Mongoose, Upstash Redis, S3 R2, and Resend clients.
- Implemented AES-256-GCM encryption/decryption helper wrapper.
- Structured app shells, route groups, pages, layouts, and base UI primitives.
- Resolved Next.js 16 linter circular dependency parse errors.
- Fixed React 19 linter warnings regarding synchronous state updates inside effects in custom hooks.
- Configured Webpack build compilation with disabled server minification to bypass Windows native SWC memory overrun crash.
- Integrated Better Auth credentials and Google OAuth login workflows.
- Re-implemented HTML transactional email templates with inline styled JSX divs and Resend mailer triggers.
- Built custom Next.js 16 `proxy.ts` handler providing optimistic cookie-based route protection.
- Rebuilt all authentication forms (Login, Registration, Password Recovery, and Password Reset) using React Hook Form + Zod, complying with strict TS/ESLint criteria.

---

# Technical Debt

- Mobile-first redesign deferred items (2026-08-25, all documented in the Phase-4 entry and surface briefs): save-failed manual retry affordance; toolbar aria-label Ctrl-hints; sub-360px toolbar nudge; lightbox double-tap zoom; insights year-summary ribbon; settings disclosure state persistence; tiptap v3 StarterKit duplicate-extension warning; export archive streaming; media gallery virtualization/R2-list cap; entries search below the fold at 375; legacy `Button size="icon"` variant (editor toolbar only).
- Low priority: `src/constants/cache-keys.ts` declares `CACHE_KEYS` builders (`ENTRY_HOT`, `STATS`, `FLASHBACK`) but `EntryRepository` and `FlashbackService` use ad-hoc string keys (`entries:{userId}:v{n}:...`) instead. Purely a maintainability nit with no perf impact; left untouched during Phase 14 because consolidating the key builders risks churning working version-based invalidation for no gain. Revisit if cache keys are ever centralized.

All Phase 1 modules compile cleanly and pass linter/typecheck verification successfully.

---

# Known Issues

Track active issues.

Example

Editor toolbar overlaps keyboard on Safari.

Priority:

Medium

Status:

Open

---

# Future Ideas

Ideas that should not be implemented immediately.

Examples:

AI Reflection

Semantic Search

Native Mobile App

Voice Journaling

Offline Sync

Do not allow this list to influence the current implementation roadmap.

---

# Working Rules

Every AI assistant should follow these rules.

Before writing code:

1. Read PROJECT_STATE.md.

2. Read the documentation.

3. Understand the current phase.

4. Review recent decisions.

5. Check blockers.

6. Continue only from the active milestone.

Never restart completed work.

Never duplicate completed work.

Never skip phases.

---

# Updating This File

Whenever a meaningful milestone is completed:

Update:

Current Phase

Current Goals

Recent Decisions

Technical Debt

Known Issues

Progress Checklist

Last Updated

Keep this document concise.

Target length:

100–250 lines.

It should remain easy to read at the beginning of every development session.

---

# Definition of Success

A new AI assistant should be able to read only:

- PROJECT_STATE.md
- PRD.md
- DESIGN_SYSTEM.md
- ARCHITECTURE.md
- IMPLEMENTATION_PLAN.md

and immediately understand:

- what Withink is,
- how it should look,
- how it should be built,
- what has already been completed,
- what should be built next.

If those questions are answered clearly,

PROJECT_STATE.md is fulfilling its purpose.