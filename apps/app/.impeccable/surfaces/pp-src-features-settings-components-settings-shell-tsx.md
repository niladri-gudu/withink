---
version: 1
slug: "pp-src-features-settings-components-settings-shell-tsx"
primary_target: "apps/app/src/features/settings/components/settings-shell.tsx"
related_targets: ["apps/app/src/features/settings/components/settings-group.tsx","apps/app/src/features/settings/components/delete-account-dialog.tsx","apps/app/src/features/encryption/components/zk-setup-dialog.tsx","apps/app/src/features/encryption/components/zk-change-dialog.tsx","apps/app/src/features/lock/components/lock-change-dialog.tsx","apps/app/src/features/export/components/data-export-card.tsx"]
---

# Surface brief — Settings (the colophon)

## Scope
The /settings surface: five ruled groups — Profile / Appearance & paper feel / Privacy & security (sign-in password + zero-knowledge + Diary Lock) / Your data (connected accounts, export, sign out) / Danger zone — plus the migrated dialogs (delete account, ZK setup/change, PIN change, PIN setup-in-dialog).

## Mode
Operate, low-frequency. Users arrive with one task ("turn on the lock", "export everything") and must land on it within seconds; forms stay calm and honest.

## Audience
Job: reach a setting and finish it. On phones, settings must not be an endless scroll: each group is a disclosure row (icon badge, title, one-line summary, chevron; aria-expanded; Profile open by default). On desktop every group renders expanded as ruled sections — pure CSS split (stateful trigger `lg:hidden`, static header `hidden lg:flex`), so SSR paints correctly on both with no media-query JS.

## Direction
Groups are hairline-separated sections in the codex's ruled language — never cards-in-cards; the Danger zone sits last inside its own destructive-tinted band, always expanded. Privacy & security pools the three security rituals with quiet internal headings and hairline dividers; Your data pools connected accounts, the ZIP export (JSZip stays lazily imported), and sign out. Every bespoke overlay was migrated onto Phase-1 primitives with Radix owning focus trap/Escape: DeleteAccountDialog (type-DELETE + conditional password), ZkSetupDialog and ZkChangeDialog (owning their crypto flows; dismissal locked while migrating), LockChangeDialog (three-step PIN flow, OTP inputs intact), and LockSetupOnboarding rendered `variant="dialog"` from Settings while the app shell's first-launch prompt keeps it a GateLayout gate. Forms stay react-hook-form + zod where they were; toggles carry role="switch"; the lock-timeout picker uses the shared tokenized Select.

## Memorable moment
 Tapping "Privacy & security" and watching three quiet rituals unfold under one hairline — password, cipher, lock — each finishing with a gold check.

## Unresolved decisions
- Disclosure state is per-visit (no persistence); could remember last-open group if usage warrants.
- Danger zone is always expanded even on phones (deliberate: destructive actions shouldn't hide).


## Phase 4 finalization (2026-08-24)
- Theme swatch hexes (bg-[#EADFC7]/[#3A2D1D]/[#33291C]) are the SANCTIONED token exception: swatches must depict the other theme fixed colors and cannot be semantic tokens. Documented in DESIGN.md.
- Dark --destructive hardened oklch(0.62 to 0.66 0.13 30) for AA text contrast on the dark card (3.97 to 4.76:1 measured); the filled destructive Button variant remains unused app-side.
- Disclosure groups, migrated dialogs, and the danger band verified unchanged at 375 and 1440.
