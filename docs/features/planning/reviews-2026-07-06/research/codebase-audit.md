# Codebase Audit — Reviews Feature

**Purpose:** Reference synthesis of the Lamina platform conventions the `reviews` feature must follow. Every claim below is backed by a path in the repo (`lamina/platform`). This document is descriptive, not prescriptive — the design decisions are in the parent `TECH-SPEC.md`.

**Audit date:** 2026-07-06
**Repo root:** `lamina/platform`

---

## 1. Database layer

### Drizzle + SQLite (libSQL/Turso), module-owned schemas

- ORM is **Drizzle** with the `sqlite-core` dialect; the production backing store is **libSQL/Turso** (local dev uses `data/dev.db`). Confirmed by imports throughout `src/modules/commerce/schema.ts` (`drizzle-orm/sqlite-core`) and `src/modules/reviews/schema.ts`.
- A **"Postgres-swap-clean" codemod** has already normalized the schema surface so a dialect swap is a codemod, not a rewrite. Documented in `docs/recipes/swap-database-to-postgres.md`.
- **Each module owns its `schema.ts`** and table definitions stay colocated with their feature module. The aggregated schema is a pure re-export barrel at `src/lib/db/schema/index.ts`, which re-exports every module schema (e.g. `export * from "@/modules/commerce/schema";`). `reviews` is already wired in: `export * from "@/modules/reviews/schema";`.
- **Migrations** live in `drizzle/` (currently `0000`–`0031`). They are generated, not hand-written.
- **Commands** (from `package.json`):
  - `npm run db:generate` → `drizzle-kit generate`
  - `npm run db:migrate` → `drizzle-kit migrate`
  - `npm run seed:reset` → drops `data/dev.db*`, migrates, seeds.
- Config in `drizzle.config.ts`.

### Existing `reviews` schema (already committed)

A `src/modules/reviews/schema.ts` already exists and matches the approved design exactly — five tables: `reviews`, `review_replies`, `review_targets`, `review_aggregates`, `review_votes`. Indexes include `(targetType, targetId, status)`, `(personId)`, and a unique `(personId, targetType, targetId)` for one-review-per-person. This file is the source of truth for the schema section of the TECH-SPEC.

> Note: there is also a no-extension `src/modules/reviews/validation` file that appears to be a stray duplicate of `validation.ts`. Out of scope for this dossier; flag for cleanup during implementation.

---

## 2. Module pattern

Each feature module under `src/modules/<feature>/` follows the same shape:

- `schema.ts` — Drizzle table definitions + inferred row types.
- `queries.ts` — read-side data access (pure-ish, no auth).
- `actions.ts` — **server actions** (`"use server"`), the write surface.
- `validation.ts` — Zod schemas for inputs.
- `admin/` — admin-only helpers/actions.
- `public/` — storefront/reader-facing helpers/components.

Reference modules: `src/modules/commerce/` (most complete: `schema.ts`, `queries.ts`, `storefront-queries.ts`, `product-actions.ts`, `order-actions.ts`, `checkout-actions.ts`, `collection-actions.ts`, `shipping-actions.ts`), `src/modules/forms/`, `src/modules/entries/`, `src/modules/custom-types/`, `src/modules/people/`.

### Server-action conventions

- Marked `"use server"`.
- Admin actions call `requireUser()` (cookie auth) and `writeAudit(...)`; public actions call `getViewer()`.
- Return a `Result<T>` envelope (success/failure discriminated union).
- Invalidate cache with `updateTag(...)` / Next's `revalidateTag(...)` keyed by a stable tag string (e.g. `"products"`, `"reviews"`).
- Audit is **fire-and-forget**: `writeAudit({ userId, action, ownerType, ownerId, meta })`.

Example write path: `src/app/api/v1/products/route.ts` POST calls `requireApiUser()`, `parseBody(req)`, `productSchema.safeParse`, `db.insert(...).returning(...)`, `revalidateTag("products", "max")`, `writeAudit({...})`, returns `ok({ id }, 201)`.

---

## 3. Auth — dual surface

There are three auth entry points, each with its own guard:

1. **Cookie admin auth** — `requireUser()` (session cookie). Used by all `src/app/admin/(panel)/...` server actions and routes.
2. **Public reader auth** — `getViewer()` resolves the `person_session` cookie to a `people` row (end-user identity). Used by storefront server actions and the block render path. Lives in `src/modules/people/viewer.ts` (and `session.ts`).
3. **Bearer API auth** — `requireApiUser()` resolves an API token (SHA-256 hashed, stored in `src/modules/auth/api-tokens/`). Used by every `/api/v1/*` route.

The reviews feature uses **all three**: `getViewer()` for public submit/vote, `requireUser()` for admin moderation, `requireApiUser()` for the REST API.

---

## 4. API v1 conventions

- Routes live at `src/app/api/v1/<resource>/route.ts` (+ `[id]/route.ts` for item ops).
- Helpers imported from `@/lib/api/v1` (`src/lib/api/v1.ts`): `handle`, `ok`, `fail`, `parseBody`.
- Envelope is `{ ok: true, data } | { ok: false, error }`.
- Every route calls `requireApiUser()`, and mutating routes call `writeAudit(...)` + `revalidateTag(...)`.
- Existing resources to mirror: `products` (`src/app/api/v1/products/route.ts` + `[id]/route.ts` + `[id]/variants/route.ts`), `orders`, `forms`, `pages`, `entries`, `custom-types`, `people`, `me`, `collections`, etc.

Reference file (the template to copy):

```ts
// src/app/api/v1/products/route.ts
import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";
import { revalidateTag } from "next/cache";
```

---

## 5. Block system

### `BlockDef` shape

`BlockDef` (`src/blocks/types.ts`) = `{ type, category, label, icon, blurb, schema, make, Render, bound?, nestable?, suggestedFor? }`.

- `category` values include `"dynamic"` (data-backed blocks) vs static layout/content blocks.
- **Bound blocks** (`bound: true`) have content resolved server-side and register a **resolver** in `src/blocks/resolvers.ts` (server-only). Unbound blocks store their content inline in the block node.
- Registry is `src/blocks/registry.ts` — a flat list of `*Def` imports re-exported as `blockDefs`.
- Block content for bound blocks is stored in `block_sets` keyed by `(ownerType, ownerId, variant)`.
- `suggestedFor: ["*"]` makes a block suggested everywhere.

### Polymorphic target pattern (the one reviews mirrors)

`block_sets.ownerType` is a **free-form string** such as `"page"`, `"entry:project"`, `"product"`, `"type-template:<slug>:<kind>"`, `"chrome:<kind>"`. The reviews feature reuses this exact convention for `reviews.targetType` (`"product" | "entry:<entity>" | "custom:<slug>" | "page" | "post"`). This is why a polymorphic string column (not a FK) is correct here — the platform's custom-types system grows arbitrarily, exactly as `block_sets` already assumes.

### Existing review-adjacent blocks (gap analysis)

- `src/blocks/rating/` — **static** rating display (no persistence, no user input).
- `src/blocks/testimonial/` — **static** curated quotes (hand-authored, not user-generated).

Neither is user-generated. The reviews block fills a clear gap: a data-backed, user-generated reviews surface.

### Blocks to mirror for implementation

- **Bound + dynamic**: `src/blocks/entry-list/` (bound block with a server resolver).
- **Delegates to a client renderer**: `src/blocks/form/` (server `Render` shells out to a client component for interactivity). The reviews block combines both: bound resolver + client `ReviewsRenderer`.

---

## 6. People / CRM

- `src/modules/people/schema.ts` defines the `people` table = **end-user identity** (distinct from admin `users`).
- `getViewer()` (`src/modules/people/viewer.ts`) resolves the `person_session` cookie to a viewer.
- `personActivity` timeline records end-user actions. The `type` enum at `src/modules/people/schema.ts:42` is:
  ```
  enum: ["view", "form", "order", "subscribe", "login", "note", "review"]
  ```
  **`"review"` is already present** — no schema change needed for the activity-type enum. (Activity rows are written from `submitReview`.)

---

## 7. Orders → verified-purchase

- `orders.personId` + `orderItems.productId` are the join keys for verified-purchase computation (`src/modules/commerce/schema.ts`).
- `orders.status` enum: `["pending","paid","unfulfilled","fulfilled","refunded","disputed","cancelled"]`. Verified-purchase = `orders.personId = reviewer.personId AND orderItems.productId = targetId AND orders.status IN ("paid","fulfilled")`.
- **No precomputed "verified purchaser" flag exists** — it is computed at query time in `computeVerified`. This is the intended design.

### Review-request trigger point

`src/modules/commerce/order-actions.ts` marks an order fulfilled at roughly line 41 (`.set({ status: "fulfilled", tracking: ... })`). The review-request email trigger fires off this transition (post-fulfillment). The email adapter is swappable (see §9), so v1 wires the trigger here and emits via the console adapter in dev.

---

## 8. Forms → reusable rate-limit

- `src/modules/forms/rate-limit.ts` is a **DB-backed sliding-window limiter** that reuses the `loginAttempts` table (a generic keyed counter, serverless-safe). Window = 10 min, max = 8 submissions, keyed by `sha256("form:<formId>|<ip>")`.
- `src/modules/forms/submit-actions.ts` is the full submit pipeline (honeypot, rate-limit, CRM routing).
- **Reviews reuses this exact pattern** keyed by `sha256("review:<targetType>:<targetId>|<personId|ip>")` for submit, and a separate key for vote toggling.

---

## 9. Entitlements gate (verified-enrollment)

- `src/modules/entitlements/gate.ts` defines the `Gate` algebra:
  ```ts
  type Gate =
    | { kind: "membership"; tier: string }   // "" = any active member
    | { kind: "pack"; packType: "block_pack" | "design_pack"; packEntryId: string }
    | { kind: "any"; gates: Gate[] }
    | { kind: "all"; gates: Gate[] };
  ```
- `resolveMembershipGate(viewer, gate)` is **pure/sync** (membership-only; pack gates fail closed inline because the block walker can't await mid-render).
- `resolveEntitlement` is the **async** variant that can check pack entitlements against the DB (`hasPackEntitlement` from `src/modules/marketplace/entitlements`).
- Reviews uses `resolveEntitlement` to compute `verified` for **entries / custom types / pages / posts** that are membership- or pack-gated → `verifiedMethod = "enrollment" | "membership"`.
- **Course-completion tracking does not exist yet** — v1 gates on enrollment, not completion. This is a documented v1 limitation.

---

## 10. Email adapter

- Interface lives in `src/adapters/types.ts` (transactional/marketing email delivery). The **default impl is console-only** (logs to stdout in dev); a real driver is not built and is **out of v1 scope** for reviews.
- `getEmail()` returns the active adapter. Reviews' `email.ts` calls `getEmail()` so a future real driver is a drop-in.
- Adapter architecture is documented in `docs/architecture/adapters.md`.

---

## 11. Audit log

- `writeAudit({ userId, action, ownerType, ownerId, meta })` is **fire-and-forget** (`src/modules/audit/log.ts`, schema in `src/modules/audit/schema.ts`).
- Every reviews mutation (submit, vote, edit, delete, approve, reject, hide, reply, config change, import) writes an audit row with `action` like `"review.submit"`, `"review.approve"`, etc., and `ownerType: "review"`.

---

## 12. Swift app

- **No `app-swift/` directory exists in the repo yet** (searched to depth 4). The Swift companion app is **v1 build scope**, mirroring patterns established in a prior session (per the approved design). Implementation will add `app-swift/Models/Review.swift`, `app-swift/Models/ReviewAggregate.swift`, `app-swift/Features/Reviews/ReviewsScreen.swift`, `app-swift/Features/Reviews/ReviewDetail.swift`, and `APIClient` methods, matching the existing Swift module/file conventions from that prior session.

---

## 13. Conventions summary (the checklist an implementer must hit)

| Concern | Convention | Reference |
|---|---|---|
| Schema | module-owned `schema.ts`, re-exported in `src/lib/db/schema/index.ts` | `src/modules/reviews/schema.ts` ✓ |
| Migrations | generated, never hand-written | `npm run db:generate` |
| Server actions | `"use server"`, `Result<T>`, `writeAudit`, `updateTag`/`revalidateTag` | `src/modules/commerce/*-actions.ts` |
| Admin auth | `requireUser()` (cookie) | `src/app/admin/(panel)/shop/products` |
| Public auth | `getViewer()` (person_session) | `src/modules/people/viewer.ts` |
| API auth | `requireApiUser()` (bearer) | `src/modules/auth/api-tokens/guards` |
| API envelope | `{ok,data}\|{ok:false,error}` via `handle/ok/fail/parseBody` | `src/lib/api/v1.ts` |
| Block | `BlockDef` + registry + (bound) resolver | `src/blocks/registry.ts`, `src/blocks/resolvers.ts` |
| Polymorphic target | string `targetType` (mirror `block_sets.ownerType`) | `src/modules/blocks/schema.ts` |
| Rate limit | DB-backed sliding window via `loginAttempts` | `src/modules/forms/rate-limit.ts` |
| Verified (products) | join `orders`+`orderItems` | `src/modules/commerce/schema.ts` |
| Verified (content) | `resolveEntitlement` | `src/modules/entitlements/gate.ts` |
| Email | `getEmail()` adapter (console default) | `src/adapters/types.ts` |
| Audit | `writeAudit(...)` fire-and-forget | `src/modules/audit/log.ts` |
| Activity timeline | `"review"` already in enum | `src/modules/people/schema.ts:42` |
