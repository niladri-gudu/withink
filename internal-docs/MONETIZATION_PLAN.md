# Withink Monetization Plan

Version: 1.0
Status: Approved Strategy → Implementation Pending
Owner: Product

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

---

## 2. Final Pricing Matrix

| Feature | Free $0 | Plus $4.99/mo · $39/yr | Pro $9.99/mo · $79/yr | Lifetime ~$199 once |
|---|---|---|---|---|
| Entries & words | Unlimited | Unlimited | Unlimited | Unlimited |
| Read & edit past entries | Anytime | Anytime | Anytime | Anytime |
| Revision history (fast-follow) | 7 days | 90 days | Forever | Forever |
| Backfill missed days | 14 days | 90 days | Unlimited | Unlimited |
| Notebooks (fast-follow) | 1 | 10 | Unlimited | Unlimited |
| Active devices | 1 at a time* | 3 | Unlimited | Unlimited |
| Photo storage | 100MB | 10GB | 50GB | 50GB |
| Themes & typography (fast-follow) | Standard | All curated styles | Curated custom accents & fonts | Same as Pro |
| Reminders & weekly digest (later) | — | ✓ | ✓ | ✓ |
| PDF & book export (later) | — | Standard PDF | Custom layouts | Same as Pro |
| Letters to future self (fast-follow) | — | 3 active | Unlimited | Unlimited |
| Voice notes, E2EE audio (later) | — | — | ✓ | ✓ |
| Priority support & early betas | — | — | ✓ | ✓ |

\* Signing in on a new device automatically signs out the oldest session.
Full cloud sync and backup included on every plan.

Lifetime = Pro forever, plus cosmetic perks (Founding Member badge,
supporters page opt-in). No storage delta over Pro (margin protection).

**Launch decision (2026-08-26): Lifetime is deferred to a fast-follow.**
Launch scope is the three subscription products only
(`plus-monthly`, `plus-yearly`, `pro-monthly`, `pro-yearly`). The one-time
purchase path, `lifetime` account flag, and Founding Member UI were removed
before any real sale, so no grandfathering or migration applies. Re-adding it
later means: a Dodo one-time product + env id, the webhook lifetime branch,
and a settings card state.

Payments: Dodo Payments (merchant of record — handles global tax).
Products at launch: `plus-monthly`, `plus-yearly`, `pro-monthly`,
`pro-yearly`.

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
| Notebooks | Fast-follow | Schema addition + entry migration |
| Revision history | Fast-follow | Snapshot pipeline; start with single previous-version slot |
| Letters to future self | Fast-follow | Read-path seal logic |
| Premium themes/fonts | Fast-follow | Curated asset work over token system |
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

### Gate #3 — Concurrent sessions (soft-kick)
- On session creation (Better Auth database hook on session create):
  count active sessions for user; while count > `maxSessions`, delete the
  oldest sessions (FIFO).
- Pro/Lifetime: skip entirely.
- Best-effort courtesy email via Resend: "You signed in on a new device."
- Verify existing password-reset flow already clears all sessions.
- Edge: offline pending sync on a revoked device flushes on next unlock
  (existing diary-password re-unlock path handles this — no new work).

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

Definition of Done follows internal-docs/CLAUDE.md (types, lint, build,
a11y, responsive, tests, no TODOs, docs updated).

---

## 9. Open Decisions (default chosen; veto before Phase C)

1. Downgrade timing: webhook-cancel downgrades immediately; extra devices
   die by natural soft-kick (no mass revocation). Default: yes.
2. Subscription management: prefer Dodo customer portal link inside
   settings; fallback = contact flow. Default: portal if available.
3. Lifetime fulfillment: webhook-only (no license keys) for v1.
   Default: yes.

---

## 10. Post-Launch Roadmap

Fast-follow order (perceived value ÷ effort):
notebooks → revision history (slot → retention tiers) → future letters →
curated themes/fonts.

Later: voice notes (E2EE audio; transcripts once privacy story solved) →
PDF/book export → reminders + weekly digest (needs scheduler infra).

Marketing tail: replace the deliberately-omitted pricing copy on the docs
landing ("pricing undecided" note in `.impeccable/surfaces/apps-docs.md`)
with real numbers at launch.
