# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the **Reflective Writer**: someone who journals nearly daily, values a beautiful and private writing experience, re-reads past entries often, and wants a long-term place for their life story. The interface and every feature decision are designed around their daily ritual.

Secondary audiences (confirmed in PRD): the Busy Professional (fast, short reflections, zero friction), the Memory Keeper (long-term archive with photos, dependable backups, export), and the Self-Improvement user (mood and habit tracking, insights). These are not equal design targets — they are accommodated, but the Reflective Writer owns the surface.

## Product Purpose

Withink is a private digital sanctuary for thoughtful reflection and lifelong journaling. It helps people build a durable daily writing habit in a calm, beautiful, trustworthy space — explicitly the opposite of note-taking or productivity software. Success means a user thinks "this feels like my personal sanctuary" and keeps returning for years, not "this app has many features."

## Positioning

A neighboring journaling product could not truthfully copy Withink's combined position: **zero-knowledge privacy by default** (journal content is encrypted client-side; encryption keys never leave the browser, and the server holds no decryption capability), **one entry per day** with a writing-window firewall, **calm over productivity** (no folders, gamification, or notification spam — insights inspire, never shame), and **data freedom as a feature** (first-class plain-text/ZIP export; users are never locked in).

## Operating Context

- Daily ritual: write today's single entry in a focused editor; autosave is invisible and offline-resilient; a quiet save indicator is the only feedback.
- Memory layer: **Flashbacks** surface historical entries, prioritizing entries written exactly one year ago; **Insights** show streaks, yearly heatmap, moods, and patterns without judgment.
- Content: rich text (Tiptap), mood per entry, images attached to entries and browsed in a media library; full-text search with highlighted matches.
- Security ritual: optional **Sanctuary Lock** (local passcode PIN) as a second layer beyond login; auto-lock timeouts and tab-switch locking.
- Data ownership: ZIP export (plain text, HTML, images, metadata) via `GET /api/export`; account deletion purges all data.
- Two surfaces share one product: the app at `app.withink.me` and the marketing/legal site at `withink.me`. Sessions span subdomains via wildcard cookies.

## Capabilities and Constraints

Confirmed capabilities: email+password and Google sign-in; one-entry-per-day journal with grace-period writing window; rich-text editor with autosave and offline queue; search; flashbacks (anniversary-prioritized, Redis-cached, refreshable); media upload to R2 with deep reference scrubbing on delete; insights; settings (themes, paper-feel scale, security); feedback submission; ZIP export; Sanctuary Lock.

Confirmed constraints and business rules: entries are encrypted client-side and the server never decrypts user content (zero-knowledge); only the lock-session token and legacy migration use server decryption; one entry per day (no backfilling outside the grace window, no future entries); strict per-user ownership on every action; media ownership with broken-reference cleanup; rate-limited feedback/auth flows; client input is never trusted.

Explicitly undecided: the details of a future paid tier (what it charges for, pricing) — the product is free today with paid plans planned.

## Brand Commitments

- Name: "withink." (lowercase, trailing period).
- Identity: a private, calm "sanctuary" for thoughts and reflections — the word sanctuary and the calm/privacy framing are central and binding.
- Tagline: "A private, encrypted digital sanctuary for your thoughts and reflections. Built for focus and calmness."
- Voice: calm, warm, editorial, reassuring — never gamified, judgmental, or pushy.
- Products: Withink is a product of the withinkme handle on Twitter/X and GitHub; contact email is niladrigudu@gmail.com.

## Evidence on Hand

- `internal-docs/PRD.md` — full product requirements (source of truth for features and philosophy).
- `internal-docs/PROJECT_STATE.md` — build history, phases 1–18, recent decisions.
- `internal-docs/DESIGN_SYSTEM.md` and `internal-docs/ARCHITECTURE.md` — incumbent visual and technical systems.
- `packages/config/src/site.ts` — canonical name, tagline, URLs, and links.

No testimonials, case studies, press mentions, or real-user usage data exist on hand; future design work must not fabricate any.

## Product Principles

1. **Privacy is the product, not a feature.** Content is encrypted client-side; the server cannot read entries; the interface communicates safety without legal language.
2. **Writing comes first.** Everything exists to support today's entry; anything that distracts from writing is reconsidered.
3. **Calm over productivity.** Minimal chrome, generous whitespace, gentle interactions; insights and streaks encourage without shaming or gamifying.
4. **Reflection, not organization.** Flashbacks and re-reading matter more than folders, tags, or archiving; navigation feels like flipping through a journal.
5. **Trust through longevity.** Data is always exportable, formats are durable, and users are never locked in — the product is built for ten years of use.

## Accessibility & Inclusion

Accessibility is a core requirement, not an enhancement (per PRD): keyboard navigation, screen readers, semantic HTML, reduced motion, high contrast, visible focus indicators, and accessible forms across every screen.
