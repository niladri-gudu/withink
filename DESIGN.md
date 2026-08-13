---
name: Withink (docs surface)
description: A private journal as a warm field notebook. Your ordinary days are worth keeping.
colors:
  manila: "oklch(0.925 0.022 82)"
  ledger-paper: "oklch(0.972 0.013 85)"
  ink: "oklch(0.24 0.028 48)"
  ink-fade: "oklch(0.47 0.02 52)"
  hairline: "oklch(0.84 0.018 79)"
  old-paper-gold: "oklch(0.70 0.10 75)"
  vermilion: "oklch(0.5 0.15 30)"
  umber: "oklch(0.21 0.018 70)"
  parchment: "oklch(0.92 0.015 80)"
  night-gold: "oklch(0.74 0.11 75)"
  night-hairline: "oklch(0.34 0.016 70)"
  desk-sand: "oklch(0.948 0.017 84)"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "3.75rem"
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
  chip: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xl-2: "40px"
  xl-3: "48px"
  xl-4: "64px"
  xl-5: "80px"
  xl-6: "96px"
components:
  card:
    backgroundColor: "{colors.ledger-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    border: "1px {colors.hairline}"
    padding: "24px 28px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ledger-paper}"
    rounded: "{rounded.control}"
    font: "Alegreya, 0.75rem, 500, 0.2em uppercase"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    border: "1px {colors.hairline}"
    font: "Alegreya, 0.75rem, 500, 0.2em uppercase"
  input:
    backgroundColor: "color-mix(in oklch, {colors.desk-sand}, transparent 15%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    border: "1px {colors.hairline}"
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
- **Old Paper Gold** (`oklch(0.70 0.10 75)` ≈ `#C39553`): the single accent — text selection, icon tints, focus rings, hover-border warmth, the "Saved" dot, progress, success states. ≤5% of any screen.

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
