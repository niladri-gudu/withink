---
version: 1
slug: "pp-src-features-journal-components-journal-editor-shell-tsx"
primary_target: "apps/app/src/features/journal/components/journal-editor-shell.tsx"
related_targets: ["apps/app/src/app/(app)/page.tsx","apps/app/src/features/journal/components/editor/editor-toolbar.tsx","apps/app/src/features/journal/components/dashboard-hero.tsx"]
---

# Surface brief â€” Journal (the writing experience: fullscreen editor + dashboard)

## Scope
The two surfaces a writer lives in: the fullscreen journal editor at /entries/[date] (header row, title, mood, Tiptap surface, thumb toolbar, formatting sheet, link dialog, zen mode, save-state presentation) and the phone-first dashboard (/) that opens the ritual. The app shell's fullscreen escape hatch (app-shell.tsx) is part of this surface's contract.

## Mode
Operate. The visitor completes today's entry â€” mostly one-handed, on a phone, at day's end, often with the keyboard up. Typing latency, thumb reach, and invisible autosave outrank everything; the paper (manila, ledger rules, Alegreya + Caveat, one gold accent) carries the identity while chrome disappears.

## Audience
Job: the Reflective Writer captures today's page in seconds and re-reads old ones calmly. On phones they need: back + date + save state in one quiet line; bold/italic/underline/lists within thumb arc; everything else one tap deeper in the "+" sheet; zen that hides every floating pixel until tapped. On desktop the long-form desk keeps the full inline toolbar, the margin rail, and the floating save pill.

## Direction
One scroll container (the shell's #main-content), ONE owner of fixed overlays per route (journal-editor-shell renders the scroll-progress hairline, the toolbar, and the sm+ save pill â€” nothing else may). The editor route is a TRUE fullscreen surface via the shell's documented conditional wrapper: no masthead, no tab bar, no content padding; the max-w-3xl measure inside is reading comfort, not shell padding. Toolbar = thumb-first primary row (undo/redo Â· B/I/U Â· bullet Â· task Â· "+" Â· word-count chip trailing, sticky right) with the quieter controls (H1â€“H3, strike, highlight, ordered, quote, code, clear, LINK, IMAGE) in a Phase-1 Sheet (bottom on phones, right folio panel on md+); links use a focus-trapped Dialog, never window.prompt. Save states render from one source (SaveIndicator): quiet inline text in the header row on phones, floating pill on sm+. Zen on phones hides ALL chrome and reveals the toolbar on tap (auto-hide ~3s); desktop zen keeps its dimmed chrome. Dashboard: PageHeader owns the running head; order is Today card (dominant, thumb-sized CTA) â†’ streak margin note â†’ flashback â†’ recent reflections; the yesterday-missed banner is a calm, session-dismissible hairline card.

## Memorable moment
The toolbar that floats just above the keyboard like a pencil tray â€” haptics on every tap, gold dot confirming "Saved Â· Synced" in the header line â€” and zen, where tapping the page briefly hands you the pencil tray, then the paper swallows the chrome again.

## Unresolved decisions
- The yesterday banner is verified by code review + unit paths; seeded data always has yesterday written, so the dismissed/visible states were not exercised visually in the Phase 2 browser pass.
- Sub-360px devices may nudge the primary toolbar cluster under the sticky word-count chip (scroll safety net retained by design).
- tiptap v3 StarterKit now bundles link/underline; tiptap-editor.tsx configures both and logs a duplicate-extension warning â€” pre-existing, deferred (editor internals out of Phase 2 scope).


## Phase 4 finalization (2026-08-24)
- Impeccable critique (degraded single-context run): 35/40 Excellent. No P0/P1.
- Keyboard walkthrough verified: title to moods (44px) to editor to toolbar all reachable; Bold activates via Enter with focus returning to the editor.
- Deferred (debt list): manual retry affordance on the save-failed state (auto-backoff already converges); Ctrl-hints in toolbar aria-labels are desktop-oriented; sub-360px toolbar nudge stands as documented.
- The toolbar h-10 touch size remains the ONE documented exception to the 44px rule.
