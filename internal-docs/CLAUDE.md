# CLAUDE.md

# Withink V2 - AI Engineering Guide

Version: 2.0

---

# Purpose

Welcome to the Withink V2 repository.

This repository contains a complete rebuild of the original Withink application.

Your responsibility is **not** to migrate code.

Your responsibility is to build the best possible implementation of the product while preserving its functionality.

Think like a Staff Software Engineer, Product Engineer, Product Designer, and Security Engineer.

Always prioritize:

- User Experience
- Simplicity
- Performance
- Security
- Accessibility
- Maintainability

---

# Repository Structure

```
/
├── apps/
│   ├── app/              ← Version 2 Dashboard App Layer (app.withink.me)
│   └── docs/             ← Public Landing & Policy Pages (withink.me)
├── packages/             ← Shared workspace packages (@withink/ui, @withink/tokens, @withink/utils, ...)
└── internal-docs/        ← Markdown engineering docs (Architecture, PRD, design system, logs)
```

---

## apps/app

This directory contains the main development repository representing the diary dashboard application running on `app.withink.me`. All dashboard UI components, database operations, auth routes, and services are implemented here.

---

## apps/docs

This directory contains the public marketing landing page, legal philosophy pages, and an animated Contact Us page running on `withink.me`.

---

## packages

Shared code extracted into a Turborepo workspace. Currently includes:

- `@withink/config` — site configuration
- `@withink/eslint-config` — shared ESLint flat config
- `@withink/theme` — theme provider (next-themes + cross-tab cookie sync)
- `@withink/tokens` — canonical design-token CSS layer (`theme.css`)
- `@withink/typescript-config` — shared TypeScript compiler presets
- `@withink/ui` — shadcn-style UI kit (Button, Card, Input, Textarea, Skeleton, Tooltip, BrandLoader, ThemeToggle)
- `@withink/utils` — `cn()` and other pure utilities

Packages ship as source and are consumed via `transpilePackages`; the data layer
(Mongoose models, repositories, storage, email, auth) remains app-local and can be
extracted into `packages/` in a future phase.

---

## internal-docs

This directory contains engineering documentation, PRD guides, and session logs.

---

# Documentation Order

Before writing any code, always read the documentation in this order.

1. PROJECT_STATE.md

2. IMPLEMENTATION_PLAN.md

3. ARCHITECTURE.md

4. DESIGN_SYSTEM.md

5. PRD.md

The documentation is the source of truth.

If the old project conflicts with documentation,

the documentation wins.

---

# Development Workflow

Every development session should follow this process.

## Step 1

Read PROJECT_STATE.md.

Understand:

- Current phase
- Current milestone
- Completed work
- Active blockers
- Recent decisions

---

## Step 2

Read the relevant documentation.

Never rely on memory.

Always verify requirements.

---

## Step 3

Study Version 1.

Understand behavior.

Understand business rules.

Understand edge cases.

Do not copy implementation.

---

## Step 4

Create an implementation plan.

Think before writing code.

Break large tasks into smaller ones.

---

## Step 5

Implement.

Prefer quality over speed.

---

## Step 6

Test.

Review.

Refactor.

Simplify.

---

## Step 7

Update PROJECT_STATE.md.

Record:

- Progress
- Decisions
- Remaining work
- Technical debt
- Current phase

---

Before implementing any feature:

- Inspect the corresponding implementation inside `old`.
- Understand the business rules.
- Understand the edge cases.
- Understand the user flow.

Do not copy the implementation.

Rebuild it using the current architecture and design system.

---

# Engineering Rules

Always:

- Prefer Server Components.
- Prefer Server Actions.
- Prefer feature-first architecture.
- Prefer composition.
- Prefer reusable components.
- Prefer semantic design tokens.
- Prefer small modules.
- Prefer explicit code.
- Prefer readability.

Never:

- Duplicate logic.
- Duplicate components.
- Copy Version 1.
- Create giant components.
- Hardcode colors.
- Hardcode spacing.
- Ignore accessibility.
- Ignore validation.
- Ignore authorization.

---

# Code Quality

Every file should be written as if another senior engineer will maintain it.

Avoid clever code.

Avoid unnecessary abstractions.

Avoid premature optimization.

Keep functions focused.

Keep components small.

Keep modules independent.

---

# Security

Always assume client input is malicious.

Always:

- Validate
- Sanitize
- Authorize

Never trust:

- Request body
- Query parameters
- Cookies
- Headers
- Uploaded files

Never expose secrets.

Never leak implementation details.

---

# Design Rules

Always follow DESIGN_SYSTEM.md.

Never invent new colors.

Never invent spacing.

Never invent typography.

Never invent animations.

The design system exists to keep the application visually consistent.

---

# Motion

Use:

```
motion
```

Install using:

```bash
pnpm add motion
```

Never use:

- Framer Motion
- GSAP
- Anime.js

Animations should be:

- Fast
- Smooth
- Subtle
- Purposeful

---

# Performance

Prefer:

- Server rendering
- Streaming
- Suspense
- Lazy loading
- Dynamic imports
- Optimized images
- Minimal JavaScript

Avoid unnecessary rerenders.

Avoid duplicate requests.

Avoid large client bundles.

---

# Accessibility

Every feature must support:

- Keyboard navigation
- Focus management
- Screen readers
- ARIA labels
- Reduced motion
- High contrast

Accessibility is a requirement.

Not an enhancement.

---

# Definition of Done

A feature is complete only when:

✓ Acceptance criteria satisfied

✓ TypeScript passes

✓ ESLint passes

✓ Production build succeeds

✓ Responsive

✓ Accessible

✓ Animations complete

✓ Error states handled

✓ Loading states implemented

✓ Empty states implemented

✓ No TODO comments

✓ No duplicated logic

✓ Architecture respected

✓ Design System respected

✓ Documentation updated

✓ PROJECT_STATE.md updated

Only then proceed to the next task.

---

# Session Rules

Do not attempt to implement multiple unrelated features simultaneously.

Complete the current milestone before beginning another.

Avoid introducing new libraries unless they provide clear long-term value.

If a simpler implementation exists,

prefer it.

---

# Decision Hierarchy

When making engineering decisions, always prioritize:

1. User Experience
2. Simplicity
3. Maintainability
4. Performance
5. Security
6. Accessibility
7. Developer Experience

---

# If Requirements Are Ambiguous

If the documentation leaves room for interpretation:

Choose the solution that:

- Improves user experience.
- Simplifies the architecture.
- Reduces complexity.
- Improves maintainability.
- Improves performance.
- Improves accessibility.
- Improves security.

Do not ask for confirmation for every small engineering decision.

Use good judgment.

---

# Rebuild Philosophy

Version 2 is a rebuild.

Not a migration.

Not a refactor.

Every feature should be reconsidered.

Every implementation should be improved.

Every interaction should feel more polished.

Every page should feel more thoughtful.

Preserve functionality.

Improve everything else.

---

# Final Goal

The completed application should feel like a premium product built by an experienced product and engineering team.

Users should immediately notice improvements in:

- Design
- Performance
- Reliability
- Accessibility
- Security
- Polish

Without needing to relearn the product.

The goal is not to recreate Version 1.

The goal is to build the best possible version of Withink.

# Available Skills

The repository contains reusable Claude Code Skills under `.agents/skills/`. Before implementing any feature, inspect the available skills and determine whether one applies to the current task.

Active project skills include:
- **impeccable**: End-to-end design skill for creating, auditing, and polishing frontend interfaces.
- **motion-framer**: Modern spring physics gestures, exit animations, and transitions with Motion.
- **shadcn**: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces.
- **tailwind-design-system**: Scalable design tokens, spacing systems, and responsive patterns in Tailwind CSS v4.
- **vercel-react-best-practices**: Vercel guidelines for React and Next.js performance.
- **web-perf**: Audits page-load performance (Core Web Vitals, render-blocking, caching) via the Chrome DevTools MCP server (`chrome-devtools`).



Reuse these skills whenever appropriate.

Do not recreate guidance that already exists inside a skill.

If multiple skills are relevant, combine their recommendations while still following this repository's documentation.

Project documentation always takes precedence if there is a conflict.