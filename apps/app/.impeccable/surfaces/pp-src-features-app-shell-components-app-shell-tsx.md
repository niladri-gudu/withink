---
version: 1
slug: "pp-src-features-app-shell-components-app-shell-tsx"
primary_target: "apps/app/src/features/app-shell/components/app-shell.tsx"
related_targets: []
---

# Surface brief — App Shell (The Annotated Codex, pocket edition)

## Scope
Shell surface of apps/app (app.withink.me): desktop margin rail, mobile running head, and — new in this revision — the phone bottom tab bar with its More sheet. The shell frames every diary surface; it is the product's spine, not a page.

## Mode
Operate. The visitor completes a daily task: open today's page, flip through entries, glance at insights. Scanability, thumb reach, and native phone expectations outrank expression; brand lives in precise details (folio numerals, hairlines, the gold tick).

## Audience
Job: the Reflective Writer journals mostly one-handed on a phone, usually at day's end. They need Today reachable in one tap from anywhere, Entries one tap away, and everything else (Flashbacks, Media, Settings, Feedback, theme, sign-out) pooled in a single overflow without ever feeling hidden. Desktop remains the long-form desk and must not regress.

## Direction
One world, two desks. The Annotated Codex keeps its established identity — manila desk, ledger paper, sepia ink, one old-paper-gold accent, Alegreya + Caveat, hairline borders over shadows. On phones the index leaves the margin and becomes a native-style bottom tab bar (Today · Entries · Insights · More) speaking the rail's own language: tracked uppercase micro-labels, lucide icons, and a gold tick marking the open folio; More opens a bottom sheet whose rows carry the rail's folio numerals (03 Flashbacks, 05 Media, 06 Settings, 07 Feedback) plus a theme row and the writer's account row. On desktop the numbered folio rail stands unchanged. The editor route stays chrome-minimal on every screen; lock gates sit above all chrome and hide navigation entirely.

## Memorable moment
Continuity across breakpoints: tapping More lifts a sheet that reads like the margin rail tipped sideways into the thumb zone — same numerals, same tick, same hand-set date — so switching from desk to pocket feels like carrying the same notebook, not opening a different app.

## Unresolved decisions
- Whether Flashbacks earns a permanent tab slot once real usage data exists (it currently pools under More by design).
- Phase 2–4 work will migrate the app's chaotic h-7..h-11 icon buttons onto IconButton and bespoke overlays onto Sheet/Dialog; this phase only establishes the primitives.
- Android/iOS PWA install prompts and gesture-bar interplay are untested against viewport-fit=cover beyond safe-area padding math.


## Phase 4 finalization (2026-08-24)
- The More tab is now a real Radix SheetTrigger inside a Sheet root that also wraps the nav - Escape/trigger close restores focus to the More button (verified live).
- Sidebar collapse toggle migrated from Button size=icon to IconButton; the rail user popover dropped its off-contract z-50 (local stacking suffices).
- page-header.tsx and page-loading.tsx render running heads via text-running-head (the utility is the single source of the eyebrow voice).
- Resolved: focus restore on sheet close (was dropping to body).
