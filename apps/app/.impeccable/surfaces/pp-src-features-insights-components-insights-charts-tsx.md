---
version: 1
slug: "pp-src-features-insights-components-insights-charts-tsx"
primary_target: "apps/app/src/features/insights/components/insights-charts.tsx"
related_targets: ["apps/app/src/features/insights/components/insights-dashboard.tsx","apps/app/src/features/insights/components/calendar-heatmap.tsx","apps/app/src/features/insights/components/monthly-overview.tsx","apps/app/src/features/insights/components/mood-history-charts.tsx","apps/app/src/features/insights/components/word-count-charts.tsx"]
---

# Surface brief — Insights (a quiet look at your year)

## Scope
The /insights surface: the ruled stat passage (streaks, words, entries) in InsightsDashboard, and the lazy-loaded charts chunk (InsightsCharts) — the month-pager heatmap, mood distribution + six-month trend, writing volume bars, activity summaries, and the monthly review. Data comes from a Redis-cached server action; this surface is presentation-only.

## Mode
Read + Operate hybrid: mostly reading your own patterns, with tap-to-inspect details. Calm numbers over dashboards; nothing hover-only.

## Audience
Job: glance at consistency (stat passage), then answer two questions by touch — "when did I write?" (month pager) and "how did it feel?" (trend nodes). Every data point must be reachable one-handed on a phone; desktop may show the same components at full width.

## Direction
The old GitHub-style 365-day strip (min-w-[760px] scroll, hover-only tooltips) is replaced everywhere by a month-by-month pager: chevron pagers (IconButton), month label + per-month summary caption, one month of intensity squares with legible day numerals (ink-on-gold ≥4.5:1 at every step). Any written day is tappable → Popover (date · words · mood · "Open this reflection" link); unwritten days are inert tiles. The same Popover pattern carries mood-trend nodes (with an invisible 12px halo hit target) and volume-bar columns (full-height transparent hit rect) — no dead tooltips anywhere. Stats passage stays 2-up on phones / 4-up on md+, tightened to p-4 phone density. Monthly review uses the shared tokenized Select; its mood distribution reads 2-up with the fifth tile spanning, 5-up from sm. The lazy chunk boundary is preserved — all visualizations still stream as one async chunk behind the header and stat cards.

## Memorable moment
 Paging through your year like folio leaves and tapping a gold square — the day's story lifts out of the grid in place.

## Unresolved decisions
- Month pager replaces the year-at-a-glance entirely (Phase-3 decision); a year-summary ribbon could return if readers miss the long view.
- Chart SVGs keep fixed viewBoxes that scale fluidly; labels are 9–11px serif — verified readable at 375px but could step up if complaints arrive.
