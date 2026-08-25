---
version: 1
slug: "pp-src-features-journal-components-entries-page-shell-tsx"
primary_target: "apps/app/src/features/journal/components/entries-page-shell.tsx"
related_targets: ["apps/app/src/features/journal/components/entries-calendar.tsx","apps/app/src/features/journal/components/entries-timeline.tsx","apps/app/src/features/journal/components/entries-controls.tsx","apps/app/src/features/journal/components/entries-folio.tsx"]
---

# Surface brief — Entries (the archive: month pager + timeline)

## Scope
The /entries browse surface: PageHeader, sticky search/filter controls (EntriesControls), the compact month pager (EntriesCalendar), the at-a-glance folio metrics (EntriesFolio), and the paginated reflections timeline with the kebab→confirm delete flow (EntriesTimeline). The shell composes them phone-first; desktop keeps the sticky calendar rail.

## Mode
Operate. The writer is looking for a specific past page or idly flipping through their archive, one-handed on a phone. Search reachability, 44px targets, and never losing your place while paging outrank decoration.

## Audience
Job: find and reopen a past reflection in seconds. On phones they need: search pinned under the header at all times; mood/time filters one tap deeper in a bottom sheet of chips; a month pager whose chevrons and day cells are thumb-sized; metrics reduced to a quiet folio row. On desktop the two-column layout — sticky calendar + stats rail left, timeline right — stands unchanged.

## Direction
One archive, two desks. Phones read a single column in strict order: running head → sticky search (+ Filters trigger with active-count badge) → compact month pager → one-line folio row (`12 Streak · 84 Entries · 312 Avg words`) → full-width cards with a clean meta row (date · words) → pagination. Filters open the Phase-1 bottom Sheet: chip toggles for time range and mood (aria-pressed, gold ring when active), Clear all + Show reflections footer; removable active-filter chips sit under the search bar. Desktop keeps inline selects (the shared tokenized `@withink/ui/select`), the ruled three-up stat card above the calendar, and the side-timeline nodes. The ONE destructive convention applies: a visible ⋮ IconButton per card opens the shared ConfirmDialog ("Delete this reflection?") — no hover-reveal, no inline Yes/No strips. Search state lives in the shell so controls can pin above both columns; the timeline resets to page 1 via render-time filter adjustment (no cascading effects).

## Memorable moment
Scrolling the archive while the search bar stays put like a bookmark ribbon — pull the month pager through a year with your thumb, tap a colored square, and that morning's page opens.

## Unresolved decisions
- LIMIT stays 5 per page for both breakpoints; infinite scroll considered but deferred (pagination is honest about archive size).
- Calendar day cells are ~43px squares at 375px (grid math); acceptable touch size, but could grow if filters move fully off-screen in future.


## Phase 4 finalization (2026-08-24)
- Eyebrows/legends across controls, calendar, folio, and timeline migrated to text-running-head (tracking drift 0.12/0.14/0.15em eliminated).
- Sticky search+filters verified pinning below the 56px header once scrolled past natural position; the below-fold position at 375 is the shipped Phase-3 IA (documented, not a defect).
- Tracked-caps action links (View Archive, RE-READ) remain the control voice - intentionally not eyebrows.
