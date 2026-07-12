# Implementation Plan - Frontend Polish & Refactoring (V2.1)

This plan details a comprehensive refactor of the Withink V2 frontend across both the `app/` and `docs/` workspaces, addressing visual styling, accessibility (a11y), performance, and animations using `motion/react`.

## User Review Required

> [!IMPORTANT]
> - **Animation Framework**: We strictly adhere to the repository's rule of using Matt Perry's new `motion` library (imported via `"motion/react"`). GSAP, Framer Motion (the old standalone library), and CSS animation libraries remain unused to maintain bundle size and performance.
> - **Theme Transitions**: Transition-property values are optimized in `globals.css` to allow color and border changes to flow seamlessly (200ms) without interfering with layout and scale animations (which are managed dynamically by the spring physics of the `motion` components).

## Open Questions

None. The requirements are fully detailed, and the implementation rules from `internal-docs/CLAUDE.md` and `internal-docs/DESIGN_SYSTEM.md` serve as the source of truth.

---

## Proposed Changes

### Component: Core Styling & Theme Tokens

#### [MODIFY] [globals.css](file:///d:/code/saas/temp/app/src/app/globals.css) and [globals.css](file:///d:/code/saas/temp/docs/src/app/globals.css)
- **Visuals**: Introduce custom semantic CSS variables for mood ratings (1 to 5) under `:root` (Sand theme) and `.dark` (Moon theme) inside the CSS layer.
- Map them inside Tailwind's `@theme` configuration:
  - `--color-mood-angry` / `--color-mood-angry-bg` / `--color-mood-angry-border`
  - `--color-mood-sad` / `--color-mood-sad-bg` / `--color-mood-sad-border`
  - `--color-mood-neutral` / `--color-mood-neutral-bg` / `--color-mood-neutral-border`
  - `--color-mood-happy` / `--color-mood-happy-bg` / `--color-mood-happy-border`
  - `--color-mood-radiant` / `--color-mood-radiant-bg` / `--color-mood-radiant-border`
- **a11y**: Ensure focus outlines explicitly set `focus-visible:outline-none` alongside ring styles to prevent double outlines in certain browser environments.

---

### Component: App Shell (`app/src/features/app-shell`)

#### [MODIFY] [sidebar.tsx](file:///d:/code/saas/temp/app/src/features/app-shell/components/sidebar.tsx)
- **a11y**: Add `aria-label`, `aria-expanded`, and `aria-haspopup` attributes where needed (e.g. collapse button, user profile triggers). Ensure tooltips are fully active in collapsed mode to describe navigation links.
- **Animations**: Replace the jittery CSS width transition on the desktop `aside` with a hardware-accelerated spring-based `motion.aside` transition using `motion/react`.
- **a11y**: Add `focus-visible:outline-none` to sidebar button links so they use the standard focus-visible rings cleanly.

#### [MODIFY] [header.tsx](file:///d:/code/saas/temp/app/src/features/app-shell/components/header.tsx)
- **a11y**: Set proper `aria-label` attributes on the mobile menu hamburger button.

---

### Component: Security Lock (`app/src/features/lock`)

#### [MODIFY] [lock-screen.tsx](file:///d:/code/saas/temp/app/src/features/lock/components/lock-screen.tsx)
- **a11y**: Add dynamic `aria-label` to the PIN bullets display to announce progress (e.g., "Passcode: 2 of 4 digits entered").
- **a11y**: Add keyboard accessibility/focus states (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`) to all buttons in the keypad.
- **a11y**: Trap keyboard focus in the password recovery and email recovery panels using `useFocusTrap`.
- **Animations**: Enhance views switching and button taps with spring-based motion variants.
- **Perf**: Replace user-facing ellipses `...` with typographic `…` (e.g., `Verifying…`, `Sending…`).
- **a11y & Perf**: Add `autocomplete` tags to input fields (`autocomplete="current-password"` for password verify, `autocomplete="one-time-code"` for email verify).

#### [MODIFY] [lock-setup-onboarding.tsx](file:///d:/code/saas/temp/app/src/features/lock/components/lock-setup-onboarding.tsx)
- **a11y**: Add descriptive ARIA labels to the setup PIN input boxes and focus visible styling.
- **Animations**: Polish panel entry and step transitions using spring animations.
- **Perf**: Replace raw `...` with typographic `…` inside load actions.

#### [MODIFY] [lock-change-modal.tsx](file:///d:/code/saas/temp/app/src/features/lock/components/lock-change-modal.tsx)
- **a11y**: Add focus traps and outline indicators.
- **Perf**: Replace raw `...` with typographic `…` inside load actions.

---

### Component: Journal & Timeline (`app/src/features/journal`)

#### [MODIFY] [mood-selector.tsx](file:///d:/code/saas/temp/app/src/features/journal/components/mood-selector.tsx)
- **Visuals**: Clean up mood color configurations to consume semantic theme colors instead of hardcoded raw orange and emerald CSS styles.
- **Animations**: Inject spring-based hover scale (`whileHover={{ scale: 1.08 }}`) and click bounce (`whileTap={{ scale: 0.92 }}`) animations.

#### [MODIFY] [save-indicator.tsx](file:///d:/code/saas/temp/app/src/features/journal/components/save-indicator.tsx)
- **Animations**: Refactor custom CSS fade-ins to spring-driven `AnimatePresence` animations.
- **Perf**: Replace raw `...` with typographic `…`.

#### [MODIFY] [entries-calendar.tsx](file:///d:/code/saas/temp/app/src/features/journal/components/entries-calendar.tsx)
- **Animations**: Animate month changes using sliding variants to simulate turning notebook pages.
- **a11y**: Add a visually hidden `aria-live="polite"` element that announces month navigation changes to screen readers (e.g., "Showing July 2026").

#### [MODIFY] [entries-timeline.tsx](file:///d:/code/saas/temp/app/src/features/journal/components/entries-timeline.tsx)
- **Visuals**: Standardize mood colors to consume semantic tokens.
- **Animations**: Animate the timeline list using a spring stagger-fade reveal transition.
- **a11y & Perf**: Set `autocomplete="off"` on search input to prevent password manager overlays. Replace ellipses `...` with typographic `…`.

---

### Component: Media Gallery (`app/src/features/media`)

#### [MODIFY] [media-gallery.tsx](file:///d:/code/saas/temp/app/src/features/media/components/media-gallery.tsx)
- **a11y**: Ensure all interactive thumbnail cells use `focus-visible:outline-none focus-visible:ring-2` focus rings.
- **Animations**: Inject a stagger-fade transition when rendering images in the grid and list layouts.
- **Perf**: Replace ellipses `...` with typographic `…`.

#### [MODIFY] [media-lightbox.tsx](file:///d:/code/saas/temp/app/src/features/media/components/media-lightbox.tsx)
- **a11y**: Set focus-visible outline indicators for lightbox navigation and close buttons.
- **Animations**: Enhance pop-in with clean spring-driven scale and fade transitions using `AnimatePresence`.
- **Perf**: Replace ellipses `...` with typographic `…`.

---

### Component: Flashbacks & Insights

#### [MODIFY] [flashback-view.tsx](file:///d:/code/saas/temp/app/src/features/flashbacks/components/flashback-view.tsx)
- **Visuals**: Map mood badges to use standard semantic theme colors.
- **Animations**: Animate flashbacks card loading and refresh operations with spring-based slide-in animations.
- **Perf**: Replace ellipses `...` with typographic `…`.

#### [MODIFY] [monthly-overview.tsx](file:///d:/code/saas/temp/app/src/features/insights/components/monthly-overview.tsx)
- **Visuals**: Replace hardcoded mood colors with CSS variables.

#### [MODIFY] [mood-history-charts.tsx](file:///d:/code/saas/temp/app/src/features/insights/components/mood-history-charts.tsx)
- **Visuals**: Replace hardcoded mood progress bar colors with the standard oklch mood colors.

---

### Component: Public Marketing Website (`docs/`)

#### [MODIFY] [landing-page-content.tsx](file:///d:/code/saas/temp/docs/src/components/landing-page-content.tsx)
- **Visuals**: Standardize cards and buttons with premium design details (low-contrast borders, shadow-sm, glassmorphism overlays).
- **Animations**: Add clean spring-based hover states and reveal animations using `motion`.
- **Perf**: Replace ellipses `...` with typographic `…`.

#### [MODIFY] [page.tsx](file:///d:/code/saas/temp/docs/src/app/contact/page.tsx) (Contact page)
- **a11y**: Add accessible focus visible rings to forms, and ensure autocomplete is defined (`autocomplete="name"`, `autocomplete="email"`).
- **Perf**: Replace ellipses `...` with typographic `…`.

---

## Verification Plan

### Automated Tests
Run the entire Vitest suite to ensure all 91 unit and integration tests continue to pass with zero regressions:
```powershell
pnpm --filter withink-app test
```
Additionally, check for clean linting and TypeScript compilation across both projects:
```powershell
pnpm lint
pnpm typecheck
```

### Manual Verification
1. Verify keyboard navigation on the Media Gallery and ensure focus-visible states display cleanly on all clickable elements.
2. Confirm the Sidebar collapse animation functions smoothly without layout jank.
3. Test that the passcode lock screen is fully keyboard navigable, and recovery screens successfully trap focus.
4. Open the site in dark and light modes to check the alignment of mood indicator colors and page loading states.