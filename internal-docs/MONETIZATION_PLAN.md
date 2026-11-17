# Withink Monetization Plan

Version: 1.1
Status: Revised launch posture → local-first pricing
Owner: Product

> **v1.1 (2026-11-15):** Free is now local-first; paid is sync, backup, and
> scale. Adds INR pricing, a capped founding offer, and an explicit
> prerequisite: the local-first refactor must land before the v1.1
> entitlements replace the v1.0 server-backed gates.

---

## 1. Purpose

Defines Withink's pricing strategy and the launch-slice implementation plan
for monetization. Canonical tier structure lives here; engineering follows
the phases in §8.

Guiding rules (non-negotiable):

- Entries and words are unlimited on every tier.
- Reading and editing existing entries is free forever.
- Privacy is never gated: zero-knowledge encryption, diary lock, offline
  writing, search, tags, basic export stay free.
- Nothing a user created under a higher tier becomes inaccessible on
  downgrade (grandfathering) — only new actions are gated.
- Free is local-first: the journal works fully on-device. Cloud sync,
  automatic backup, and cloud media are the paid value.

---

## 2. Final Pricing Matrix

Model: **Free forever, on your device. Pay for sync, backup, and scale.**

| Feature | Free $0 / ₹0 | Plus $4.99/mo · $39/yr<br>₹249/mo · ₹1,999/yr | Pro $9.99/mo · $79/yr<br>₹499/mo · ₹3,999/yr |
|---|---|---|---|
| Entries & words | Unlimited | Unlimited | Unlimited |
| Read & edit past entries | Anytime | Anytime | Anytime |
| Offline / local-first use | Source of truth | Yes | Yes |
| Cloud sync | — (local only) | Up to 4 devices | Unlimited devices |
| Automatic encrypted backup | Manual export only | Yes | Yes |
| Backfill missed days | 14 days | 90 days | Unlimited |
| Notebooks | 1 | 3 | 10 |
| Cloud photo storage | — (device storage) | 10 GB | 50 GB |
| Themes & typography | Standard | All curated styles | Curated + fonts/accents |
| Letters to future self | 1 active | 3 active | Unlimited |
| Reminders & weekly digest | — | ✓ | ✓ |
| PDF & book export | — | Standard PDF | Custom layouts |
| Voice notes, E2EE audio | — | — | ✓ |
| Priority support & early betas | — | — | ✓ |

**Annual is the default offer** (~⅓ off; "2 months free"). Monthly is the
convenience option. Add a **14-day money-back guarantee**.

**Founding offer (first 50 users):** $49/yr locked for life (Pro features) or
₹2,999/yr. Optional cash injection: **$99 lifetime for the first 25** only.
Never re-run a lifetime offer after the cap.

**Free-tier promise:** unlimited entries/words, zero-knowledge encryption,
diary lock, offline writing, search, and **manual encrypted export/import**
stay free forever. Security and data ownership are never gated.

**Tier decision (2026-08-26): Notebooks are capped 1 / 3 / 10 — not
unlimited.** Entries and words are already unlimited on every tier, so a
finite ladder keeps the perk honest and differentiable. A Pro user at 10
sees a calm informational dialog (nothing to sell), Free/Plus see the
standard upgrade paywall. Grandfathering is unchanged: existing notebooks
stay fully usable on downgrade; only creation is gated.

**Lifetime is still deferred as a standing plan.** The only lifetime path at
launch is the capped founding offer above. The one-time purchase path and
`lifetime` account flag stay out of the codebase until a real, capped
founding batch exists. Re-adding it means: a Dodo one-time product + env id,
the webhook lifetime branch, and a settings card state.

Payments: Dodo Payments (merchant of record — handles global tax).
Products at launch: `plus-monthly`, `plus-yearly`, `pro-monthly`,
`pro-yearly`. INR pricing is PPP-adjusted (Plus ₹249/mo · ₹1,999/yr,
Pro ₹499/mo · ₹3,999/yr) and auto-selected by locale where Dodo supports it.

**Engineering note:** `apps/app/src/features/billing/config/plans.ts` still
holds the v1.0 server-backed entitlements (Free: 100 MB media, 1 session,
0 letters). Do not change it until the local-first mode lands; the matrix
above is the spec for that change.

### 2.1 Local-first model (why the gates change)

- **Free is the app**: an installable PWA whose source of truth is
  IndexedDB/device storage. It works with no account, no network, and no cold
  start. Manual encrypted export is the backup path.
- **Paid is the safety net**: automatic E2E cloud backup, sync across devices,
  and cloud media. This is the peace-of-mind purchase.
- **Devices**: Free is not device-limited (each device is local). Plus limits
  *synced* devices to 4; Pro is unlimited.
- **Media**: Free media lives on the device; paid tiers add cloud media.
- **Data loss**: because Free is local-only, the app must (a) request
  persistent storage, (b) nudge manual encrypted export, and (c) support
  import. A journal that can silently disappear is not shippable.

This model is only honest once the local-first refactor removes server reads
from the render path (see §8 Phase E). Until then, the current server-backed
behavior and v1.0 entitlement values stand.

---

## 3. Launch Scope

In scope (this document's phases):

- Entitlements spine (plans config, entitlements service, billing records)
- Gate #1: backfill windows (entry creation dates)
- Gate #2: media storage quota (per-tier)
- Gate #3: concurrent session soft-kick (device caps)
- Dodo checkout + webhook processing
- Pricing page (docs site) + Plan & Billing section (settings)

Explicitly deferred:

| Feature | When | Why |
|---|---|---|
| ~~Notebooks~~ | **Shipped 2026-08-26** | Entries gained `notebookId`; default notebook bootstrapped lazily with a one-time backfill; gates on creation only (1/3/10), full downgrade grandfathering. |
| ~~Revision history~~ | **Removed 2026-08-27** | Was shipped earlier the same day (single previous-version slot, hourly capture throttle, read-time retention) and pulled the same day — product call: a single-slot restore point is too niche to justify the surface area. Code fully reverted; `entryrevisions` was dev-only, never in prod. IF ever re-added, the locked design is: up to **10 checkpoints per day** on every tier (capture inserts instead of overwrites; prune keeps newest 10 within the window), the dialog becomes a checkpoint list, and the 7/90/∞ retention stays the paid gate — slot count is not tiered. |
| ~~Letters to future self~~ | **Shipped 2026-08-27** | Read-path seal logic: passive delivery on the viewer-local unlock date (server-enforced at reveal), `readAt` arrival badges on the dashboard, composer reuses the Tiptap editor with online-only autosave, ZK cipher storage identical to entries, slots count only undelivered letters (grandfathering-native), export includes a `letters/` section. |
| ~~Premium themes/fonts~~ | **Shipped 2026-08-28** | Curated palettes (Vellum, Indigo Nook, Rosewood — each with day+night) gate at Plus; Pro adds font pairings (Literata, Quill) and accent hues (oxblood, indigo ink, moss), all WCAG-contrast-measured. Plan resolved server-side for gating; selections persist client-side and are grandfathered on downgrade (only NEW selection gated). Cosmetic-only: no server action, hand-edited localStorage is an accepted (documented) risk. |
| Voice notes E2EE | Later | New media pipeline (recorder/worker/player) |
| PDF/book export | Later | Rendering engine work |
| Reminders + digest | Later | Requires new scheduled-jobs infrastructure |

---

## 4. Data Model

New collection `billingaccounts` (feature-local model, per repository pattern):

```ts
interface IBillingAccount {
  userId: string;            // unique index
  plan: "free" | "plus" | "pro";
  lifetime: boolean;         // true ⇒ plan resolves to "pro" regardless
  interval: "monthly" | "yearly" | null;
  status: "active" | "canceled" | "past_due";
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  currentPeriodEnd?: Date;
}
```

- Do NOT add fields to Better Auth's user schema; billing stays isolated.
- Resolved plan is cached in Redis (`billing:{userId}`, 60s TTL),
  invalidated by webhook writes — mirrors existing settings-cache patterns.

---

## 5. New Feature Folder

```
apps/app/src/features/billing/
├── config/plans.ts                 ← single source of truth (§2 matrix as data)
├── actions/billing-actions.ts      ← createCheckoutAction, openCustomerPortalAction
├── repositories/
│   ├── billing-account-model.ts
│   └── billing-account-repository.ts
├── services/
│   ├── entitlements-service.ts     ← resolveEntitlements(userId) → Entitlements
│   └── dodo-service.ts             ← API client (checkout/session, portal), webhook verify
└── components/
    ├── plan-card.tsx               ← settings "Plan & Billing" card
    └── upgrade-dialog.tsx          ← paywall moment dialog (quota/window tripped)
```

`plans.ts` shape (illustrative):

```ts
export const ENTITLEMENTS = {
  free: { backfillDays: 14, mediaStorageBytes: 100 * MB, maxSessions: 1 },
  plus: { backfillDays: 90, mediaStorageBytes: 10 * GB, maxSessions: 3 },
  pro:  { backfillDays: Infinity, mediaStorageBytes: 50 * GB, maxSessions: Infinity },
} as const;
export type PaidPlan = "plus" | "pro";
export type ResolvedPlan = PaidPlan | "free";
```

> Target v1.1 values (after Phases E/F): Free has no cloud sync, unlimited
> local devices, and 1 letter; Plus has 4 synced devices and 10 GB cloud
> media; Pro is unlimited. Until then, `plans.ts` keeps the v1.0
> server-backed values.

---

## 6. Gate Wirings (Launch)

### Gate #1 — Backfill window
- Locate every use of `LIMITS.JOURNAL.BACKDATE_GRACE_PERIOD_DAYS`
  (`rg "BACKDATE_GRACE_PERIOD_DAYS apps/app/src"`): editor route date
  selection + server-side save validation.
- Server action remains authoritative: requested `date` must satisfy
  `date >= today - entitlements.backfillDays` (viewer-local today via
  `withink-local-date` cookie, same as current checks).
- Behavior change note: Free moves 3 → 14 days (intentional, approved).
- Out-of-window attempt → `UpgradeDialog` with copy tied to the window.

### Gate #2 — Media storage quota
- `api/media/upload/route.ts`: replace hardcoded
  `STORAGE_LIMIT_BYTES = 50MB` with `entitlements.mediaStorageBytes`;
  keep existing Redis usage counter + R2-truth reseed unchanged.
- `constants/limits.ts`: keep `MEDIA.MAX_FILE_SIZE_BYTES` global (5MB/file
  is a per-file safety bound, not a tier perk); move per-user storage into
  plans config.
- Media page quota bar receives the resolved limit via server props.
- Over-quota upload → 402-style error payload → `UpgradeDialog`.
- Grandfathering: existing over-quota users can still view/delete; only
  new uploads are blocked (current behavior, preserved).
- **v1.1:** the quota becomes **cloud media** only. Once local-first ships,
  Free photos live on the device and are bounded by device storage, not a
  server quota; Plus/Pro get 10 GB / 50 GB of cloud media.

### Gate #3 — Concurrent sessions (soft-kick)
- On session creation (Better Auth database hook on session create):
  count active sessions for user; while count > `maxSessions`, delete the
  oldest sessions (FIFO).
- Pro/Lifetime: skip entirely.
- **v1.1:** this becomes a **synced-device cap**, not a signed-in-session
  cap. Free is not device-limited (each device is local); Plus allows 4
  synced devices; Pro is unlimited. Ships with the local-first refactor.
- Best-effort courtesy email via Resend: "You signed in on a new device."
- Verify existing password-reset flow already clears all sessions.
- Edge: offline pending sync on a revoked device flushes on next unlock
  (existing diary-password re-unlock path handles this — no new work).

### Gate #4 — Letter slots
- Free: 1 active (undelivered) letter — a taste of the emotional feature.
  Plus: 3. Pro: unlimited. Only undelivered letters count (grandfathering-
  native), matching the shipped behavior.

### Gate #5 — Cloud sync entitlement
- Free: none. The app is local-only; manual encrypted export is the backup.
- Plus: automatic E2E cloud backup + sync up to 4 devices.
- Pro: unlimited synced devices.
- This gate ships only with the local-first refactor (§8 Phase E); until
  then the current server-backed 1/3/∞ session behavior stands.

---

## 7. Dodo Payments Integration

### Checkout
- `createCheckoutAction(planKey)`: rate-limited (10/hour/user); calls Dodo
  API to create a checkout session carrying `metadata.userId` + product id;
  returns redirect URL. Authed users only.

### Webhook — `app/api/webhooks/dodo/route.ts`
- Verify HMAC signature against raw body (`DODO_WEBHOOK_SECRET`),
  timing-safe compare. Reject otherwise.
- Event mapping (idempotent — dedupe on event id before applying):
  | Event | Effect |
  |---|---|
  | subscription activated / renewed / payment succeeded | upsert BillingAccount → plan+interval+status active, set period end |
  | one-time payment succeeded (lifetime product) | plan=pro, lifetime=true |
  | subscription cancelled / expired | status=canceled → plan resolves to free |
  | payment failed | status=past_due (grace per Dodo retries; resolve free on final failure) |
  | refund processed | treat as cancellation |
- All writes invalidate the Redis entitlements cache.

### Env additions (`config/env.ts`, zod-validated, `.env.*.example`)
- `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`,
  `DODO_PRODUCT_PLUS_MONTHLY`, `DODO_PRODUCT_PLUS_YEARLY`,
  `DODO_PRODUCT_PRO_MONTHLY`, `DODO_PRODUCT_PRO_YEARLY`,
  `DODO_PRODUCT_PRO_LIFETIME`

### Security checklist
- Server-side entitlement resolution everywhere; never trust client claims.
- Webhook handler: raw body, signature verify, idempotency key, bounded
  payload parse, logger redaction (already strips sensitive keys).
- Rate-limit checkout creation; CSP unaffected (hosted checkout redirect).

---

## 8. Rollout Phases

**Phase A — Spine**: `plans.ts`, model/repository, entitlements service +
Redis cache, unit tests. No behavior change yet.

**Phase B — Gates**: wire the three gates reading entitlements (free-tier
values first = current behavior, except approved backfill 3→14). Update
affected tests. Verify each gate independently in dev.

**Phase C — Billing**: Dodo products (test mode), env vars, checkout
action, webhook route + idempotency, settings Plan card, docs `/pricing`
page. Full purchase → entitlement → gate flow in Dodo test mode.

**Phase D — Polish & ship**: upgrade/paywall dialogs, downgrade-path test
(cancel in test mode → Free rules apply, grandfathering verified),
webhook replay drill, `pnpm typecheck` → `lint` → focused `vitest` →
`build`, update `PROJECT_STATE.md`.

**Phase E — Local-first mode** (prerequisite for v1.1 gates): static app
shell, local unlock gate, routes read IndexedDB first, background-only sync,
persistent-storage + encrypted export/import UX. This is also the performance
fix: no server read on the render path, so no cold start in front of the UI.

**Phase F — Pricing v1.1**: update `plans.ts` (Free: no cloud sync, unlimited
local devices, 1 letter; Plus: 4 synced devices, 10 GB cloud media; Pro:
unlimited), add INR Dodo products + the capped founding offer, update the
pricing page copy and guarantee, and swap the "cloud journal" framing for
"local-first, pay for sync/backup."

Definition of Done follows internal-docs/CLAUDE.md (types, lint, build,
a11y, responsive, tests, no TODOs, docs updated).

---

## 9. Open Decisions (default chosen; veto before Phases C/F)

1. Downgrade timing: webhook-cancel downgrades immediately; extra devices
   die by natural soft-kick (no mass revocation). Default: yes.
2. Subscription management: prefer Dodo customer portal link inside
   settings; fallback = contact flow. Default: portal if available.
3. Lifetime fulfillment: webhook-only (no license keys) for v1.
   Default: yes.
4. Free device semantics: unlimited local devices, no sync (default) vs a
   small synced-device allowance. Default: unlimited local, no sync.
5. Does Free require an account? Default: no — an account is required only
   for sync/billing. This removes signup friction from the free experience.
6. Founding offer shape: $49/yr locked for life, cap 50 (default) vs $99
   lifetime, cap 25. Default: locked annual, no standing lifetime.
7. INR pricing: auto-detect locale; Plus ₹1,999/yr, Pro ₹3,999/yr.

---

## 10. Post-Launch Roadmap

Fast-follow order (perceived value ÷ effort):
~~notebooks~~ (shipped) → ~~future letters~~ (shipped 2026-08-27) →
~~curated themes/fonts~~ (shipped 2026-08-28). NEXT: the "later" tail
(voice notes → PDF/book export → reminders+digest).
(Revision history was built and removed 2026-08-27 — see §3.)

Later: voice notes (E2EE audio; transcripts once privacy story solved) →
PDF/book export → reminders + weekly digest (needs scheduler infra).

Marketing tail: replace the deliberately-omitted pricing copy on the docs
landing ("pricing undecided" note in `.impeccable/surfaces/apps-docs.md`)
with real numbers at launch.

---

## 11. Go-to-market (before tuning price)

With zero users, pricing is not the bottleneck; retention is.

1. Ship Phase E so the product is instant and offline-capable.
2. Recruit 20–50 users from journaling and privacy communities
   (r/Journaling, r/privacy, r/IndieHackers, Product Hunt, journaling
   Discords).
3. Instrument activation (first entry within 24h), D7/D30 retention, and
   conversion.
4. Run the capped founding offer for the first cohort.
5. Ask early users: "What would make this a no-brainer at $39?" Build the
   answer into Plus.

Trust signals for a paid privacy product: a security page, an explicit "we
cannot read your entries and do not train AI on them" statement, a guaranteed
export, and consideration of open-sourcing the client.

Revisit Pro differentiation and any lifetime offer only after retention is
proven.
