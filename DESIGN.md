---
name: Withink (app + docs surfaces)
description: A private journal kept as a warm field notebook — the app is the inside of the notebook; the marketing site is the notebook's cover. Your ordinary days are worth keeping.
colors:
  manila: "oklch(0.925 0.022 82)"
  ledger-paper: "oklch(0.972 0.013 85)"
  ink: "oklch(0.24 0.028 48)"
  ink-fade: "oklch(0.47 0.02 52)"
  hairline: "oklch(0.84 0.018 79)"
  old-paper-gold-hardened: "oklch(0.5 0.105 75)"
  vermilion: "oklch(0.5 0.15 30)"
  umber: "oklch(0.21 0.018 70)"
  umber-card: "oklch(0.265 0.018 70)"
  parchment: "oklch(0.92 0.015 80)"
  night-gold: "oklch(0.74 0.11 75)"
  night-hairline: "oklch(0.34 0.016 70)"
  night-ink-fade: "oklch(0.68 0.018 75)"
  night-vermilion: "oklch(0.66 0.13 30)"
  desk-sand: "oklch(0.948 0.017 84)"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "fluid clamp() — historical px at ≥1024px, scales down to ~min at 375px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  running-head:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.16em"
    textTransform: uppercase
  label:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.16em"
    textTransform: uppercase
  hand:
    fontFamily: "Caveat, cursive"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  plate: "0.75rem"
  control: "0.75rem"
  sheet-top: "1rem (rounded-t-2xl bottom sheets; right/left panels 1rem on the leading edge)"
  chip: "9999px"
  icon-button: "0.75rem"
spacing:
  base: "4px scale"
  page-gutter: "24px (px-6)"
  page-top: "32px phone / 48px desktop (py-8 md:py-12)"
  card: "24–28px (p-6 md:p-7)"
  section-gap: "32–40px (space-y-8/10)"
  touch-min: "44px phone (h-11), 36px desktop density (md:h-9)"
components:
  page-header:
    runningHead: "text-running-head, muted, ruled hairline below; hand-set date right"
    title: "serif 3xl/4xl bold + gold italic accent word (4xl/5xl)"
  tab-bar:
    backgroundColor: "{colors.ledger-paper} at 90% + backdrop blur"
    border: "1px top {colors.hairline}"
    items: "Today · Entries · Insights · More; 56px targets; gold tick + tracked caps label; hidden on the editor route and while gated"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "ledger-paper"
    rounded: "{rounded.control}"
    height: "40px (44px for thumb CTAs on phones)"
    font: "Alegreya, 0.75rem, 500, 0.2em uppercase"
  icon-button:
    size: "44px phone → 36px md+ (cva primitive, aria-label REQUIRED)"
  sheet:
    variants: "auto (bottom sheet phone → right panel md+), bottom, top, left, right"
    surface: "{colors.ledger-paper}, 1px hairline, blurred veil, 200ms in / 150ms out expo-out"
  dialog:
    variants: "centered card sm/md/lg; shadow allowed (overlay elevation)"
  select:
    impl: "tokenized native <select> + chevron — the ONE select pattern"
  card:
    backgroundColor: "{colors.ledger-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    border: "1px {colors.hairline}"
    shadow: "none at rest (flat-card rule)"
  input:
    height: "44px (h-11)"
    backgroundColor: "card"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    border: "1px {colors.hairline}"
    focus: "2px gold ring (--ring)"
---

# Design System: The Field Ledger (app surface — as built)

## Overview

**Creative North Star: "The Field Ledger, kept as a diary."**

Two surfaces share one world. The **app** (app.withink.me) is the *inside* of the private notebook — ledger-ruled pages, iron-gall ink, a gold tick marking the open folio. The **marketing site** (withink.me) is the *cover* — manila kraft desk, printed promises. This section documents the **app surface as actually shipped** (Phases 1–4 mobile-first redesign); the docs-surface section follows below, unchanged.

The app is phone-first: a bottom tab bar (Today · Entries · Insights · More) owns navigation on phones; the numbered folio rail owns desktop. The editor route is fullscreen and chrome-free. Baseline viewport 375×812.

## Colors (as shipped in `apps/app/src/app/globals.css`)

A warm, low-chroma archival band in OKLCH. Never pure white, pure black, or saturated blue.

### Light — the desk at day
- **Background / Manila** (`oklch(0.925 0.022 82)`) · **Card / Ledger Paper** (`oklch(0.972 0.013 85)`) · **Foreground / Ink** (`oklch(0.24 0.028 48)`) · **Muted / Ink Fade** (`oklch(0.47 0.02 52)`) · **Border / Hairline** (`oklch(0.84 0.018 79)`) · **Secondary / Desk Sand** (`oklch(0.948 0.017 84)`).

### The One Accent — hardened for WCAG
- **Light** `--accent`/`--ring`: `oklch(0.5 0.105 75)` — deep antique gold, ≥4.5:1 on manila (measured 4.90:1). The pale marketing gold (`oklch(0.70 0.10 75)` ≈ #C39553) failed text contrast at ~2.2:1 and is **docs-site only**.
- **Dark** `--accent`/`--ring`: `oklch(0.74 0.11 75)` — night gold (7.58:1 on umber).
- **Destructive / Vermilion**: light `oklch(0.5 0.15 30)`; dark `oklch(0.66 0.13 30)` (4.76:1 vs dark card). Danger only — no decorative stamps.

### Moods — one warm gold ramp
`--mood-angry` umber (`oklch(0.36 0.07 55)`) → `--mood-sad` → `--mood-neutral` → `--mood-happy` → `--mood-radiant` old-paper gold (`oklch(0.7 0.1 75)`). Lucide icons, never emoji. The ramp is gold-family only (One Accent Rule).

### Named Rules
**The One Accent Rule.** Gold is the only accent; success is gold; moods are a gold ramp.
**The Low-Strain Rule.** Warm archival band; no pure white/black/saturated blue.
**The WCAG-Hardened Rule.** Accent text and focus rings are token-tuned to ≥4.5:1 (text) / ≥3:1 (non-text) in BOTH themes. Never bypass tokens for UI colors. Sanctioned exceptions: the settings theme swatches (they must show the *other* theme's fixed colors) and brand logos.

## Typography

**One family, two voices:** Alegreya carries everything printed (the `--font-sans`, `--font-serif`, and `--font-mono` roles all map to Alegreya — no third voice anywhere). Caveat is the hand, for margin notes and captions only (`text-hand`, 24px).

### Hierarchy (as shipped in `packages/tokens/theme.css`)
- **Display scale** `text-display/hero/h1/h2/h3` — fluid `clamp()` curves that hit the exact desktop px at ≥1024px (h1 = 36px at 1440) and scale down gracefully to 375px (h3 ≈ 20.8px).
- **Fixed steps** `text-title/subtitle/body-large/body/body-small/caption/label/helper` — rem-fixed; 16px floor on inputs (iOS Safari zoom).
- **Running head** `text-running-head` — serif 11px / weight 500 / 0.16em / uppercase. THE eyebrow voice: page headers, card eyebrows, tab labels, folio numerals' neighbors. Never hand-roll `text-[11px] tracking-[…]` eyebrows again.
- **Hand** `text-hand` — Caveat 24px; dates in the editor header, margin notes, sheet captions.

### Named Rules
**The Two-Voice Rule.** Alegreya prints, Caveat annotates; the hand never sets headings or body.
**The One-Weight Rule.** Headings ≤ 700; hierarchy via size, spacing, voice contrast.

## Layout & Navigation

4px base. Page rhythm: `px-6` gutters, `py-8 md:py-12`, `space-y-8` sections; `max-w-5xl` content (editor column `max-w-3xl`). Cards `p-6 md:p-7`.

- **Phones (<md):** bottom tab bar (`z-[60]`, 56px targets, `pb-[env(safe-area-inset-bottom)]`, backdrop-blurred card) — Today · Entries · Insights · More. More opens the bottom Sheet (folio-numbered rows + theme + account). Content reserves tab-bar clearance.
- **Desktop (md+):** the numbered folio rail (01 Today … 07 Feedback), 264↔76px collapse, untouched.
- **Editor route** (`/entries/[date]`): fullscreen — no masthead, no tab bar, one scroll container (`#main-content`), one owner of fixed overlays.
- **Z-index contract** (documented in `globals.css`): content 0 < sticky 20 < rail 30 < editor overlays 40–50 < nav chrome (tab bar/sheet/dialog) 60 < gates 9999. Nothing outside the tiers.

### Named Rules
**The Thumb-First Rule.** Primary actions ≥44px on phones and in the bottom half; the editor toolbar is the documented 40px exception (dense writing surface).
**The Safe-Area Rule.** Fixed chrome respects `env(safe-area-inset-*)`; `viewportFit: cover` is on.

## Elevation & Motion

**Flat-Card Rule:** cards rest on hairlines; `shadow-sm` only for interactive lift; overlays may carry `shadow-lg/2xl` + backdrop blur.
**Motion:** `motion` only (never framer-motion/GSAP). 100–250ms, expo-out; overlay system 200ms in / 150ms out driven by Radix `[data-state]`. Every animation lives inside `prefers-reduced-motion: no-preference`; reduced-motion users get instant swaps and correct static positioning.

## Components (as shipped in `packages/ui` + app)

- **PageHeader** — `runningHead` + hand date ruled above serif title + gold italic accent; optional `note`, `description`, `action`, viewer-local `today`. Used on EVERY page (insights included). Skeletons mirror it (`PageLoadingHeader`).
- **TabBar + More sheet** — phone navigation; Radix Sheet trigger (focus restores to the More trigger on close).
- **Sheet** (`side: auto|bottom|top|left|right`) — auto = bottom sheet on phones → right panel md+. **Dialog** — centered, sm/md/lg. **Popover** — non-modal anchored. Radix owns focus trap/Escape; the overlay motion system owns movement.
- **IconButton** — cva 44px phone → 36px md+; `aria-label` REQUIRED (enforced in types). The only icon-button pattern.
- **Select** — tokenized native `<select>` + chevron; the one select pattern app-wide.
- **Button** — default/secondary/outline/ghost/destructive; `h-10`; thumb CTAs `h-11 w-full sm:w-fit`. (The legacy `size="icon"` survives only inside the editor toolbar's documented h-10 exception.)
- **Card / Input / Textarea / Skeleton / ConfirmDialog / GateLayout** — flat hairline cards; 44px inputs; skeletons per route that mirror real layouts; one destructive-confirm convention (visible ⋮/icon trigger → shared ConfirmDialog); gates share GateLayout at z-9999.

## App Do's and Don'ts

### Do:
- **Do** use `text-running-head` for every eyebrow; `PageHeader` for every page top; `IconButton` for every icon-only control.
- **Do** keep phones first: 44px targets, thumb-zone CTAs, safe-area insets, single column at 375.
- **Do** keep gold ≤5% of any screen and honor the hardened token values.
- **Do** keep the editor chrome-free and autosave quiet (inline save state, never a modal).

### Don't:
- **Don't** hand-roll overlays, selects, eyebrows, or icon buttons — the primitives above are the system.
- **Don't** invent z-index values outside the contract tiers.
- **Don't** use hover as the only affordance (touch has no hover); no hover-reveal anything.
- **Don't** use emoji for moods; lucide only.

---

# Design System: The Field Ledger, kept as a diary (docs surface)

## Overview

**Creative North Star: "The Field Ledger, kept as a diary"**

Withink's marketing surface (withink.me) is a warm field notebook for a life. The message is simple and human: **your ordinary days are worth keeping**. The visitor is a writer, not a collector; the diary is private, encrypted, and kept for a lifetime.

The visual language is printed and archival, softened for warmth and for consistency with the app: **manila kraft ground, iron-gall sepia ink, and a single warm old-paper gold accent** (`#C39553` — the color of aged paper in lamplight). Corners are rounded to match the app (`0.75rem`). Hairline borders over soft shadows. No framed plates in the hero — the words sit directly on the desk.

Exactly **two type voices**:
- **Alegreya** (serif) carries everything printed — headlines, prose, card titles, labels, and controls. Uppercase tracked for label moments.
- **Caveat** (hand) is used only for field-note annotations — a hero note, a keepsake caption, a lightbox caption.

No mono, no third voice. Motion is quick (100–250ms) and settles like an ink stamp.

## Colors

A warm, low-chroma archival band in OKLCH. Both themes avoid pure white, pure black, and saturated blue.

### Light — the desk at day
- **Manila** (`oklch(0.925 0.022 82)`): the ground. Base for `--background`.
- **Ledger Paper** (`oklch(0.972 0.013 85)`): card surfaces. Base for `--card`.
- **Ink** (`oklch(0.24 0.028 48)`): iron-gall sepia-black. Primary text and primary button fill.
- **Ink Fade** (`oklch(0.47 0.02 52)`): secondary text, captions.
- **Hairline** (`oklch(0.84 0.018 79)`): borders and rules.
- **Desk Sand** (`oklch(0.948 0.017 84)`): secondary fills and hover fills.

### The One Accent
- **Old Paper Gold** (`oklch(0.70 0.10 75)` ≈ `#C39553`): the single accent — text selection, icon tints, focus rings, hover-border warmth, the "Saved" dot, progress, success states. ≤5% of any screen. (Docs-site decorative value; the app hardens this token for text contrast — see the app surface above.)

### Dark — the desk after dusk
- **Umber** (`oklch(0.21 0.018 70)`): the ground. **Parchment** (`oklch(0.92 0.015 80)`): text (inverts the primary: parchment fill, umber text). **Night Gold** (`oklch(0.74 0.11 75)`): the accent, brightened to read on umber. **Night Hairline** (`oklch(0.34 0.016 70)`): borders.
- **Vermilion** (`--destructive` only): a rare, warm danger color. No decorative stamps.

### Named Rules
**The One Accent Rule.** Old paper gold is the only accent. No moss, no green, no neon. Success is gold.

**The Low-Strain Rule.** All surfaces and text sit in the warm, low-chroma archival band. Never pure white, pure black, or saturated blue.

## Typography

**Printed serif:** Alegreya (Georgia, serif fallback) — headlines, prose, card titles, labels, buttons.
**Field hand:** Caveat (cursive fallback) — annotations only.

### Hierarchy
- **Display** (Alegreya 700, `3.75rem` / 60px, lh 1.15, ls `-0.02em`): the hero's one-line promise.
- **Headline** (Alegreya 600, `1.875rem` / 30px, lh 1.3): section headings.
- **Title** (Alegreya 700, `1.25rem` / 20px): card and page titles.
- **Body** (Alegreya 400, `1rem`, lh 1.625): prose.
- **Label** (Alegreya 500, `0.6875rem` / 11px, ls `0.16em`, uppercase): headers, labels, button text.
- **Hand** (Caveat 400, `1.5rem` / 24px): the hero field note, keepsake captions.

### Named Rules
**The Two-Voice Rule.** Exactly two families: Alegreya for all printed text, Caveat for annotations. Never a third; the hand never sets a heading or body.

**The One-Weight Rule.** Headings never exceed weight 700; hierarchy is carried by size, spacing, and voice contrast.

## Layout

A calm system on a 4px base. Content sits centered in `max-w-5xl` with `px-6` and `py-20 md:py-24` rhythm. The hero is words on the open desk — no framed plate — at `max-w-3xl`, generous top padding. Sections separate on `1px` hairline `border-t`s; the privacy band is a full-bleed `secondary`-tinted band. Whitespace is designed, never filled.

## Elevation & Depth

**Border-first, shadow-seldom.** Cards rest flat on a hairline; elevation is earned.
- **At rest:** `border` only, or a whisper `shadow-sm`.
- **Interactive hover:** a card lifts — `hover:scale(1.005)` + `hover:shadow-md`, border warming toward gold.
- **Overlays only:** the lightbox carries `shadow-2xl` and `backdrop-blur`.
- **Hero:** no card, no shadow — the lamplight wash and ruled desk sit behind the type.

### Named Rules
**The Flat-Card Rule.** Static cards rest on their hairline; shadows are earned by interaction or overlays.
**The 250ms Rule.** Color/theme transitions run at `250ms` with standard easing; nothing exceeds 300ms.

## Shapes

A soft, app-consistent form language.
- **Cards, plates, buttons, inputs:** rounded at `0.75rem` — matching the app.
- **Chips and tags:** fully rounded.
- **Circular affordances only:** the lock seal, status dots, icon buttons.
- **Rules:** hairline `border-t` section separators; a `2px` gradient hairline along the editor card's top edge.

### Named Rules
**The App-Match Rule.** Corner language matches the app's `0.75rem` system. No sharp plates, no pills for controls; a circle only for a genuinely circular object.

## Components

### Cards
- **Shape:** `0.75rem` radius, `1px` hairline, `p-6 md:p-7`.
- **Hover:** borders warm toward gold; cards lift to `shadow-md`.

### Buttons
- **Shape:** `0.75rem` radius, `h-10`, `px-4`; Alegreya uppercase tracked label.
- **Primary:** ink fill, manila text. One primary per section.
- **Outline:** transparent, hairline stroke.
- **Focus:** `2px` gold ring; disabled `opacity-50`; active press `scale 0.98`.

### Inputs
Translucent desk-sand fill, `1px` hairline, `0.75rem` radius, `text-sm`, `2px` gold focus ring.

### Navbar
The wordmark, the theme toggle, and one short primary button — **"Sign In"** when signed out, **"Open"** when signed in. No other links; the full "Open Your Diary" action lives in the hero and the closing CTA.

### The diary apparatus (the demos)
- **Today's page** — the editor + mood selector (lucide icons; never emoji). Status reads **"Saving… / Saved"**. Prompt: **"How are you feeling today?"**
- **Diary Lock** — the PIN pad (the product's real feature name). Reads **"Enter your PIN"**.
- **This date, one year past** — the flashback page with a reflection note.
- **Memory pages** — the media library as pinned keepsakes with hand-written captions.
- **Export anytime** — the ZIP export.
- **Your year at a glance** — a compact writing calendar (cells scale `clamp(1.5rem, 7vw, 2.5rem)` so they never overflow on narrow phones) and mood distribution.

## Do's and Don'ts

### Do:
- **Do** keep every surface in the warm manila/umber band — no pure white, pure black, or saturated blue.
- **Do** use exactly two type voices: Alegreya for all printed text, Caveat for field notes.
- **Do** match the app's rounded corners and hairline-over-shadow elevation.
- **Do** keep the hero a framed-plate-free statement of words on the desk.
- **Do** reserve old paper gold for ≤5% of any screen and keep the nav to wordmark + theme toggle + one short primary button ("Sign In" / "Open").
- **Do** keep motion fast (100–250ms) and use it to communicate state.

### Don't:
- **Don't** add a second accent, moss/green, neon, or any third typeface (no mono).
- **Don't** use cabinet/collection vocabulary — this is a diary.
- **Don't** set the hand font for headings or body.
- **Don't** use emoji for mood — lucide icons only.
- **Don't** float static cards with heavy shadows, use sharp corners, or crowd the nav with account links.
- **Don't** exceed 300ms on any animation or apply it where reduced motion is preferred.
