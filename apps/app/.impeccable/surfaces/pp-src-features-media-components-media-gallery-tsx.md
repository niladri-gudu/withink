---
version: 1
slug: "pp-src-features-media-components-media-gallery-tsx"
primary_target: "apps/app/src/features/media/components/media-gallery.tsx"
related_targets: ["apps/app/src/features/media/components/media-lightbox.tsx"]
---

# Surface brief — Media (keepsakes, pocket-sized)

## Scope
The /media surface: the storage meter card, search/sort/view toolbar, the 2-col grid and list layouts (MediaGallery), and the fullscreen lightbox with swipe paging and confirm-delete (MediaLightbox). Ownership checks and deep-reference scrubbing live in actions/services and are untouched.

## Mode
Operate. Browsing one's own images; quick, tactile, forgiving. Nothing hides behind hover.

## Audience
Job: find a photo, see it big, jump to (or remove) the entry that holds it — mostly one-handed on a phone. Captions must be readable at rest; swiping must page the lightbox without leaving the screen.

## Direction
Grid stays 2-up on phones (3/4-up from sm/md) but every tile now carries an always-visible caption scrim — filename + date over a bottom gradient — replacing the hover-only "View Memory" veil (dead on touch). The storage meter compresses to a compact row on phones (label + object count, used/limit, hairline progress bar) with the icon reserved for md+. Sort uses the shared tokenized Select; grid/list toggles and refresh are IconButtons. The lightbox is touch-first: drag-to-swipe prev/next (threshold + velocity, `touch-pan-y`, arrows hidden below sm), a permanent "n / N" counter chip beside the close button, keyboard arrows and Escape preserved, focus trap unchanged. Delete follows the ONE convention — Trash icon → shared ConfirmDialog ("Delete this memory?") wrapping the existing scrub-then-delete flow byte-for-byte; dismissal locks while deletion runs. A quiet Close button joins the footer on small screens so dismissal never depends on hitting thin backdrop margins.

## Memorable moment
 Flicking through memories like a stack of prints — counter ticking 4 / 12 — then tapping the caption's entry link to read the day the picture belongs to.

## Unresolved decisions
- Tap-to-dismiss remains backdrop-click + explicit Close/X; double-tap-to-zoom was considered and deferred (native pinch still works).
- Lightbox delete re-fetches full entries on demand for scrubbing (pre-existing design); candidate-scrubbing from the decrypted cache remains deferred debt.
