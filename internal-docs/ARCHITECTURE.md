# Withink V2

# Architecture Document

Version: 2.0

---

# 1. Purpose

This document defines the technical architecture of Withink Version 2.

Its purpose is to ensure that every feature is implemented consistently, predictably, and maintainably.

The architecture should prioritize:

• Simplicity

• Scalability

• Maintainability

• Performance

• Security

• Reliability

Every architectural decision should reduce long-term complexity rather than optimize only for short-term development speed.

---

# 2. Architecture Philosophy

Withink is intentionally a focused product.

Its architecture should reflect that.

Avoid enterprise architecture.

Avoid unnecessary abstractions.

Avoid overengineering.

The best architecture is one that another engineer can understand in one afternoon.

Favor simplicity over cleverness.

Favor readability over brevity.

Favor explicitness over magic.

---

# 3. Guiding Principles

Every engineering decision should satisfy these principles.

## Simple

If two implementations solve the same problem,

choose the simpler one.

---

## Predictable

The same patterns should appear throughout the application.

Developers should never wonder

"How is this feature implemented?"

Every feature should follow the same conventions.

---

## Modular

Features should be isolated.

Authentication should not know about journals.

Journals should not know about exports.

Media should not know about insights.

Each module should have one responsibility.

---

## Scalable

The architecture should comfortably support

10 users

1,000 users

100,000 users

without major rewrites.

Scaling should come naturally from good architecture.

---

## Maintainable

Code will be read far more often than it is written.

Optimize for future developers.

Prefer obvious code.

Avoid hidden behavior.

Avoid unnecessary indirection.

---

# 4. System Overview

Withink consists of five major layers.

Presentation

↓

Application

↓

Domain

↓

Infrastructure

↓

External Services

Every request flows through these layers.

Each layer has a clear responsibility.

## Routing & Subdomain Strategy

Withink V2 enforces strict environment separation via subdomains:

- withink.me (Root Domain): Serves the static marketing landing page, Contact Us, Privacy Policy, and Terms & Conditions. Managed inside the `apps/docs` repository scope.
- app.withink.me (App Subdomain): Houses the secure, authenticated sanctuary journal dashboard, editor, media gallery, insights, and settings. Managed inside the `apps/app` repository scope.

---

# 5. Layer Responsibilities

## Presentation Layer

Responsible for:

User Interface

Routing

Forms

Client interactions

Accessibility

Animations

Rendering

The presentation layer should never contain business logic.

---

## Application Layer

Responsible for:

Business workflows

Validation

Permissions

Use cases

Transactions

This layer coordinates multiple services.

It does not directly communicate with the UI.

---

## Domain Layer

The domain represents the product itself.

Examples:

Journal

Entry

Flashback

Media

User

Insights

Settings

The domain contains business rules.

Business rules should never depend on frameworks.

---

## Infrastructure Layer

Responsible for:

Database

Redis

Storage

Authentication

Email

Encryption

Logging

Caching

Queue processing

External APIs

This layer should be replaceable.

Business logic should not depend on infrastructure.

---

## External Services

Examples:

MongoDB

Redis

Cloudflare R2

Better Auth

Resend

Analytics

Future AI services

Every external service should be accessed through dedicated abstractions.

Never spread SDK usage throughout the project.

---

# 6. High-Level Request Flow

Every request should follow a predictable path.

User

↓

Route

↓

Validation

↓

Authentication

↓

Authorization

↓

Business Logic

↓

Database

↓

Cache Update

↓

Response

Every feature should follow this flow.

Avoid bypassing layers.

---

# 7. Feature-Based Architecture

The project should be organized by feature,

not by file type.

Avoid folders such as

controllers/

services/

hooks/

utils/

at the root of the application.

Instead,

group related code together.

Example:

Journal

contains

UI

API

Validation

Actions

Types

Hooks

Utilities

Tests

This makes features easier to understand.

---

# 8. Separation of Concerns

Each module should own exactly one responsibility.

Authentication owns authentication.

Journal owns journals.

Media owns media.

Insights own insights.

Do not allow unrelated modules to become tightly coupled.

Dependencies should flow inward.

Never outward.

---

# 9. Data Flow

Data should always move in one direction.

Client

↓

Server Action / API

↓

Validation

↓

Business Logic

↓

Repository

↓

Database

↓

Cache

↓

Response

Never allow components to directly manipulate persistence.

---

# 10. State Management Philosophy

Do not introduce global state unless absolutely necessary.

Prefer:

Server State

↓

URL State

↓

Local Component State

↓

Context

↓

Global State

Global state should be the final option,

not the default.

The majority of the application should not require a global state library.

---

# 11. Server-First Philosophy

Withink should embrace the capabilities of modern Next.js.

Whenever possible,

compute data on the server.

Render on the server.

Fetch on the server.

Cache on the server.

Only move logic to the client when interactivity requires it.

Server Components should be the default.

Client Components should be the exception.

---

# 12. React Philosophy

React components should be predictable.

Each component should have one purpose.

Avoid components exceeding a few hundred lines.

Split components by responsibility.

Large components are usually multiple components combined together.

---

# 13. Composition Over Inheritance

Prefer composition.

Build small reusable pieces.

Combine them.

Avoid deep inheritance trees.

Favor explicit composition patterns.

---

# 14. Reusability

Not everything needs to become reusable.

Premature abstraction creates complexity.

Only extract reusable components after duplication becomes obvious.

Rule of Three:

If similar logic exists in three places,

consider abstraction.

Before then,

prefer clarity.

---

# 15. Dependency Direction

High-level modules should never depend directly on low-level implementations.

Example:

Journal Service

↓

Repository Interface

↓

Mongo Repository

Instead of

Journal Service

↓

MongoDB

This allows infrastructure to evolve without rewriting business logic.

---

# 16. Framework Independence

Business logic should not depend on Next.js.

Business logic should not depend on React.

Business logic should not depend on MongoDB.

Business logic should not depend on Better Auth.

Frameworks are implementation details.

The product should remain understandable even if technologies change.

---

# 17. Long-Term Maintainability

Every new feature should ask:

Does this fit existing architecture?

Can another engineer understand this in six months?

Does this reduce technical debt?

Can this evolve naturally?

Architecture exists to make future changes easier.

Not harder.

---

# 18. Repository Philosophy

The repository should be understandable within minutes.

A new engineer should be able to locate any feature without searching the entire project.

Navigation should feel obvious.

Every directory should communicate its purpose.

Avoid generic folders.

Avoid dumping unrelated files together.

---

# 19. Project Structure

The project should be organized around features rather than technologies.

```
src/

    app/

    features/

    components/

    lib/

    server/

    hooks/

    providers/

    types/

    styles/

    config/

    constants/

    assets/
```

Each directory should have a clear responsibility.

---

# 20. App Directory

The App Router is responsible only for routing.

Its responsibilities include

- Routes

- Layouts

- Loading UI

- Error UI

- Route groups

- Metadata

- Server rendering

Business logic should never live here.

---

Example

```
app/

    (public)/

    (auth)/

    (app)/

    api/

    layout.tsx

    loading.tsx

    error.tsx

    not-found.tsx
```

---

# 21. Feature Modules

Every feature should own itself.

Example

```
features/

    auth/

    journal/

    entries/

    media/

    insights/

    flashbacks/

    settings/

    search/

    export/
```

Each module should contain everything it needs.

Example

```
journal/

    components/

    actions/

    hooks/

    types/

    validation/

    repositories/

    services/

    utils/

    constants/

    tests/
```

Never scatter feature code throughout the repository.

---

# 22. Shared Components

Only components that are truly reusable belong inside

```
components/
```

Examples

Button

Input

Dialog

Card

Tooltip

Avatar

Dropdown

Skeleton

Separator

Badge

Spinner

Toast

Everything else belongs inside its feature.

---

# 23. Shared Libraries

The lib directory contains infrastructure.

Examples

Database

Redis

Storage

Authentication

Encryption

Caching

Utilities

Configuration

No business logic belongs here.

---

# 24. Server Directory

The server directory contains backend-specific code.

Examples

Repositories

Services

Email

Storage

Queues

Authentication

Encryption

Rate limiting

Logging

Background jobs

Anything inside this directory should never be imported into client components.

---

# 25. Hooks

Hooks should remain small.

Examples

useDebounce

useAutosave

useIntersectionObserver

Avoid hooks becoming miniature services.

Business logic belongs elsewhere.

---

# 26. Providers

Providers initialize application-wide functionality.

Examples

Theme

Authentication

Query Client

Toast

Analytics

Providers should remain lightweight.

Avoid placing application logic inside providers.

---

# 27. Types

Shared types belong here.

Avoid duplicating interfaces across modules.

Feature-specific types remain inside the feature.

---

# 28. Constants

Constants should be centralized.

Examples

Routes

Themes

Limits

Editor defaults

Configuration

Avoid hardcoded values throughout the project.

---

# 29. Assets

Assets should remain organized.

Examples

Illustrations

Icons

Images

Fonts

Lottie

SVG

Avoid mixing assets with components.

---

# 30. Naming Conventions

Directories

lowercase

```
journal

settings

media
```

Files

kebab-case

```
journal-editor.tsx

journal-sidebar.tsx

entry-card.tsx
```

Components

PascalCase

```
JournalEditor

EntryCard
```

Variables

camelCase

Constants

UPPER_SNAKE_CASE

Types

PascalCase

Interfaces should generally be avoided unless extension is required.

Prefer

```
type Entry
```

instead of

```
interface IEntry
```

---

# 31. Component Organization

Components should remain focused.

Large components indicate missing abstractions.

Prefer

```
JournalEditor

↓

EditorToolbar

↓

FormattingMenu

↓

EditorStatus

↓

ImageUploader
```

instead of

one

1200-line component.

---

# 32. Component Rules

Every component should

Have one responsibility.

Accept minimal props.

Avoid deep prop drilling.

Prefer composition.

Remain easily testable.

Avoid side effects.

---

# 33. Server Components

Server Components should be the default.

Use them whenever:

Fetching data

Reading database

Rendering layouts

Reading session

Displaying static information

Server Components reduce client JavaScript.

Prefer them.

---

# 34. Client Components

Only create Client Components when necessary.

Examples

Editor

Dropdowns

Dialogs

Drag & Drop

Animations

Mouse interactions

Touch interactions

Forms

Interactive charts

Everything else should remain server-rendered.

---

# 35. Server Actions

Prefer Server Actions whenever possible.

Examples

Create Entry

Update Entry

Delete Entry

Upload Preparation

Export

Settings Update

Advantages

Type safety.

Reduced boilerplate.

Simpler architecture.

Less API surface.

Server Actions should remain small.

Each action should perform one task.

---

# 36. API Routes

API Routes exist only when necessary.

Use them for

Webhooks

Third-party callbacks

Streaming

File uploads

External integrations

Everything else should prefer Server Actions.

---

# 37. Route Groups

Route Groups improve organization.

Example

```
(public)

(auth)

(app)
```

Separate layouts.

Separate metadata.

Separate authentication.

Avoid deeply nested routing.

---

# 38. Shared Utilities

Utilities should be pure.

Examples

Date formatting

Text formatting

String helpers

Number formatting

URL helpers

Avoid hidden state.

Avoid side effects.

---

# 39. Validation

Validation should exist close to the feature.

Example

```
journal/

    validation/

        create-entry.ts

        update-entry.ts
```

Avoid giant validation folders.

---

# 40. Feature Independence

Every feature should remain as independent as possible.

Example

Journal should not know

how

Search works.

Search should consume

Journal,

not the other way around.

Dependencies should remain directional.

---

# 41. Dependency Graph

The dependency direction should always be:

```
UI

↓

Actions

↓

Services

↓

Repositories

↓

Infrastructure
```

Never reverse this direction.

UI should never communicate directly with databases.

Repositories should never know about React.

Infrastructure should never know about components.

---

# 42. Imports

Prefer absolute imports.

Avoid long relative paths.

Good

```
@/features/journal

@/lib/auth
```

Avoid

```
../../../../components
```

Imports should remain readable.

---

# 43. Circular Dependencies

Circular dependencies are forbidden.

Modules should remain independent.

Shared functionality should move into dedicated abstractions.

---

# 44. Code Ownership

Each feature owns

its

Components

Actions

Types

Validation

Tests

Utilities

Services

Constants

Shared code should remain intentionally small.

Everything else belongs to its feature.

---

# 45. Backend Philosophy

The backend should remain boring.

Boring code is predictable.

Predictable code is maintainable.

Avoid clever abstractions.

Avoid hidden magic.

Every request should follow the same lifecycle.

Client

↓

Validation

↓

Authentication

↓

Authorization

↓

Business Logic

↓

Repository

↓

Database

↓

Cache

↓

Response

Every feature should follow this flow.

---

# 46. Business Logic

Business logic represents the product.

Not the framework.

Business logic should answer questions like:

Can this user create an entry?

Can this media be deleted?

Can this entry still be edited?

Should this flashback appear?

Business logic should never know:

MongoDB

Redis

Next.js

React

Storage SDK

Email SDK

Business logic should only know the product.

---

# 47. Repository Pattern

Every persistent model should have a repository.

Examples

EntryRepository

MediaRepository

UserRepository

FeedbackRepository

SettingsRepository

Repositories own database operations.

Services own business rules.

Never mix them.

Bad

JournalService

↓

Mongo Query

Good

JournalService

↓

EntryRepository

↓

Mongo

---

# 48. Repository Responsibilities

Repositories should

Create

Read

Update

Delete

Pagination

Filtering

Searching

Transactions

Nothing more.

Repositories should never contain business logic.

---

# 49. Services

Services coordinate repositories.

Examples

JournalService

↓

EntryRepository

↓

MediaRepository

↓

Cache

↓

Search Index

The service understands workflows.

Repositories understand persistence.

---

# 50. Validation

Every request should be validated.

Without exception.

Validation happens before business logic.

Never trust

Forms

Requests

Cookies

Headers

Query Parameters

Uploaded Files

Everything should be validated.

Prefer Zod.

Keep schemas close to features.

---

# 51. Authentication

Authentication answers

Who is making this request?

It should happen before business logic.

Authentication should remain centralized.

Never duplicate authentication logic.

---

# 52. Authorization

Authorization answers

Can this user perform this action?

Authentication

≠

Authorization

Every protected resource should verify ownership.

Never trust IDs from the client.

Always verify ownership server-side.

---

# 53. Database Philosophy

The database stores facts.

It does not enforce business workflows.

Avoid placing business rules inside queries.

The database should remain simple.

Collections should remain focused.

Avoid giant documents.

Avoid deeply nested structures.

Prefer normalization where appropriate.

---

# 54. Transactions

Use transactions whenever multiple writes must succeed together.

Examples

Delete Journal

↓

Delete Media

↓

Delete References

↓

Invalidate Cache

↓

Audit Log

Either everything succeeds

or

nothing changes.

---

# 55. Caching Philosophy

Caching is an optimization.

Never a dependency.

The application should function correctly without cache.

Redis should improve speed,

not correctness.

---

# 56. Cache Strategy

Prefer

Cache Aside

Pattern.

Flow

Read

↓

Cache

↓

Database

↓

Cache Result

Writes

↓

Database

↓

Invalidate Cache

Avoid updating multiple cache keys manually.

Prefer version-based invalidation.

---

# 57. Cache Lifetimes

Frequently changing data

↓

Short TTL

Historical data

↓

Long TTL

User preferences

↓

Long TTL

Reference data

↓

Very Long TTL

Never cache sensitive user-specific information without proper isolation.

---

# 58. Storage

Object storage should contain

Images

Exports

Attachments

Future backups

The database should store metadata.

Never binary files.

---

# 59. File Uploads

Uploads should always use presigned URLs.

The application server should never proxy large uploads.

Benefits

Lower bandwidth

Better scalability

Lower server load

Faster uploads

---

# 60. Encryption

Sensitive journal content should always be encrypted before persistence.

Encryption should happen server-side.

Clients should never know encryption keys.

Encryption should remain transparent to users.

The application should decrypt only when necessary.

---

# 61. Search

Search should remain independent.

Journal entries should never know search implementation.

Future search engines should replace current implementations without changing business logic.

Design search as a replaceable module.

---

# 62. Background Jobs

Long-running work should execute asynchronously.

Examples

Export

Image Processing

Email

Cleanup

AI Reflection

Weekly Reports

Never block user interactions waiting for long-running work.

---

# 63. Logging

Logs exist for engineers.

Not users.

Every log should answer

What happened?

When?

Why?

Which user?

What request?

Never log

Passwords

Tokens

Journal Content

Encryption Keys

Sensitive Personal Information

Logs should remain structured.

---

# 64. Error Handling

Errors should be predictable.

Every error should belong to one category.

Validation

Authentication

Authorization

Business Rule

Infrastructure

Unexpected

Unexpected errors should never leak implementation details.

---

# 65. Monitoring

Monitor

Request Duration

Database Performance

Cache Hit Rate

Storage Errors

Authentication Failures

Background Jobs

Export Success

Media Upload Success

The goal is identifying problems before users report them.

---

# 66. Rate Limiting

Protect

Authentication

Password Reset

Uploads

Feedback

Exports

Public APIs

Rate limiting should feel invisible for legitimate users.

Aggressive for abuse.

---

# 67. Security Philosophy

Assume every request is malicious until proven otherwise.

Validate everything.

Authorize everything.

Escape everything.

Sanitize everything.

Never trust client input.

Security should be proactive.

Not reactive.

---

# 68. Secret Management

Secrets should never exist inside source code.

Never commit

API Keys

JWT Secrets

Encryption Keys

Database URLs

OAuth Secrets

All secrets belong inside environment variables.

Rotate secrets when necessary.

---

# 69. Error Recovery

Failures happen.

The application should recover gracefully.

Retry where appropriate.

Rollback failed operations.

Preserve user data.

Avoid partial writes.

Never leave inconsistent state.

---

# 70. Scalability

Architecture should naturally support growth.

Avoid assumptions about

Single server

Single database

Single region

Future infrastructure changes should require minimal code changes.

Keep infrastructure isolated.

---

# 71. Testing Philosophy

Testing should prioritize behavior.

Test

Business Rules

Repositories

Services

Validation

Critical Components

Avoid testing implementation details.

Prefer testing outcomes.

---

# 72. Performance Principles

Measure before optimizing.

Avoid premature optimization.

Optimize

Large queries

Rendering

Images

Bundle Size

Caching

Network Requests

Database Indexes

Only optimize proven bottlenecks.

---

# 73. Reliability

The user should trust the application completely.

Saving should always succeed.

Exports should always complete.

Uploads should recover.

Sessions should remain stable.

The system should fail gracefully.

Reliability is a feature.

---

# 74. Observability

The system should explain itself.

When something fails,

Engineers should quickly determine

What happened?

Where?

Why?

Observability should be built into the architecture.

Not added later.

---

# 75. Definition of Good Architecture

A good architecture is one where

Features are isolated.

Code is readable.

Modules are independent.

Dependencies are obvious.

Performance is predictable.

Security is built in.

New engineers become productive quickly.

Future changes require minimal effort.

The architecture should evolve with the product,

not fight against it.

---

# End of Architecture Document

The purpose of this document is to guide every engineering decision made throughout the lifetime of Withink.

Architecture should remain invisible to users,

but invaluable to developers.

Every future feature should strengthen these principles rather than weaken them.