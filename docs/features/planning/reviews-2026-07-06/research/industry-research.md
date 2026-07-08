# Industry Research — Reviews Feature

**Purpose:** Synthesis of external reviews/ratings conventions used to ground the approved design. This is a structured reference; the decisions it informed live in the parent `TECH-SPEC.md`. Web research was used to validate the conventions below (sources cited inline; this dossier is not a live-link index but a synthesis of documented industry norms).

**Research date:** 2026-07-06

---

## 1. Rating scale — the 5-star standard

- **5-star (1–5) is the dominant standard.** Shopify's native product reviews, Udemy, Teachable, Trustpilot, Stamped.io, Yotpo, and Amazon all use 1–5 stars. This is the safe default and what the `review_targets.minRating`/`maxRating` defaults (1/5) encode.
- **Half-stars are optional.** Udemy historically used half-stars; most platforms round to whole stars. v1 uses integer ratings only (`reviews.rating` is `integer`); half-stars are a future enhancement, not v1.
- **Comment-only targets exist.** Patreon and some community platforms use likes/hearts instead of stars. The platform covers this with `review_targets.allowRating = false`, which stores `rating = 0` and renders the target as comment-only — the same table/aggregate machinery, no separate "comment" entity.

---

## 2. Verified-purchase / verified-reviewer badge

- **Gold standard (Amazon, Stamped.io):** a review is "verified" when the reviewer's email matches a real order containing the product. Amazon's "Verified Purchase" badge is the canonical example.
- **Conversion lift:** verified-purchase reviews are consistently reported to lift conversion roughly **5–12%** versus unverified (industry case studies from review-platform vendors; treat as directional, not a guarantee). Either way, verified reviews carry more weight with buyers.
- **Compliance angle (decisive for v1):** the **FTC's 2024 rule on fake reviews** prohibits fabricated endorsements and undisclosed incentives. A verified-purchase/verified-enrollment badge is a **conservative, defensible compliance posture** — it doesn't *prove* authenticity, but it signals a real transactional relationship and avoids the appearance of planted reviews. This is the primary reason the approved design makes verification a first-class, computed field rather than a manual flag.
- **Implementation in Lamina:** verification is **computed at submit/edit time** (`computeVerified` in `queries.ts`), not a free-text flag the reviewer sets:
  - Products: join `orders` + `orderItems` (`personId` + `productId` + `status IN (paid, fulfilled)`).
  - Entries/custom types/pages/posts gated by membership or pack: `resolveEntitlement`.
  - Stored as `verified` (bool) + `verifiedMethod` (`order|enrollment|membership|none`) + `verifiedRef` (the orderId/entitlement ref, for admin display).

---

## 3. Polymorphic vs. per-type join tables

- **Polymorphic (`reviewable_type` + `reviewable_id`) is the standard** in Laravel (`morphTo`/`morphMany`) and Rails (`polymorphic: true`). It's flexible and cheap to add new reviewable types.
- **Alternative — explicit join table per type** (e.g. `product_reviews`, `course_reviews`): more referential integrity (real FKs), but a new migration + table per type. Rigid when types grow.
- **Decision for Lamina:** polymorphic. The platform's custom-types system grows arbitrarily (`entry:<entity>`, `custom:<slug>`), exactly the situation polymorphic associations were designed for. This also mirrors the platform's **existing** `block_sets.ownerType`/`ownerId` polymorphic pattern, so it's consistent with an in-repo precedent rather than a new tradeoff. Existence/verified checks happen in app logic before insert (no DB-level FK), which is the accepted cost.

---

## 4. Moderation models

- **Pre-moderation:** reviews hidden until an admin approves. Highest quality control, slowest time-to-display, suppresses contribution velocity.
- **Post-moderation:** reviews visible immediately; admin can hide/remove. Fastest feedback, relies on flagging + reactive cleanup.
- **Hybrid (modern):** trusted users post-moderated, new users pre-moderated, with **ML confidence-gated** auto-approval (spam/profanity models). This is where mature platforms (Yotpo, Trustpilot) land.
- **ML is out of v1 scope.** v1 ships a simple **per-target-type `pre`/`post` toggle** (`review_targets.moderation`, default `post`) plus a manual admin queue. The schema's `status` enum (`pending|approved|rejected|hidden`) supports both modes cleanly, so an ML/hybrid layer can be layered on later without a migration.

---

## 5. Aggregation

- **Simple average + count, cached on the target row** is the v1 baseline. `review_aggregates` stores `average` (real), `count` (int), and a 5-element `distribution` array `[1★, 2★, 3★, 4★, 5★]`. Recomputed **synchronously on every review status change** (no async/stale window).
- **Modern refinements (deferred):**
  - **Weighted average with time decay** (Amazon, Udemy weight recent reviews higher).
  - **Verified-only average** alongside the all-reviews average.
  - **Bayesian smoothing** (pull toward a prior for low-count targets).
  - v1 does none of these — simple mean is correct for a first cut and the `distribution` array makes any of these a read-side computation later, no schema change.
- **SEO:** `Schema.org` `AggregateRating` + `Review` JSON-LD emitted from the block render path enables Google rich snippets (star ratings in search). This is a free conversion/CTR win and a v1 requirement.

---

## 6. Display / UX patterns

The converged storefront pattern (Amazon, Udemy, Stamped.io, Yotpo):

1. **Summary widget** at top — average, count, distribution bar, "write a review" CTA.
2. **Filter/sort bar** — sort by `recent | helpful | highest | lowest`; optional rating filter.
3. **Review list** — cards with stars, verified badge, title, body, photos, date, reviewer identity (name/avatar from `people`), and the owner reply.
4. **Owner reply** — threaded under the review. **Udemy's model: one reply per review**, removed if the student updates their review. The platform encodes this as a single `review_replies` row per review (enforced in app logic).
5. **Helpful vote** — "X found this helpful" with a toggle; `review_votes` (composite PK `reviewId,personId`) prevents double-voting and drives the `helpful` sort.
6. **Sign-in nudge** — when `getViewer()` is null and `requireLogin` is true, the form shows a "sign in to review" prompt instead of inputs.

---

## 7. Course / content-specific conventions

- **Completion-gated reviews (Udemy):** Udemy surfaces reviews from learners who completed ≥20% of a course more prominently, and shows completion %.
- **Dimension ratings:** some course/product review systems break a review into sub-dimensions (instructor / materials / value).
- **v1 stance:** the platform **does not yet track course completion**, so v1 gates on **enrollment** (membership/pack entitlement), not completion. Dimension ratings and completion % are stored in the free-form `reviews.meta` JSON (a `Record<string, unknown>`) so the data model accommodates them without a migration when completion tracking ships. No special columns for these in v1.

---

## 8. Comment-only / reaction models (Patreon-style)

- Patreon and some community platforms use **likes/hearts**, not stars, often gated by membership tier.
- The platform covers this **without a separate system**: `review_targets.allowRating = false` makes a target comment-only — `rating` is stored as `0`, no star input renders, and the aggregate machinery simply has nothing to average. A future "reaction" type can live in `reviews.meta` (`{ reaction: "heart" }`) without schema change.

---

## 9. Email triggers — review-request

- **Industry norm:** send a review-request email some time after a transaction completes (order fulfilled, course enrolled, membership granted). Timing windows vary (Amazon ~ days post-delivery; Udemy post-course-progress).
- **v1 triggers:**
  - After **order fulfillment** (`order-actions.ts` status → `fulfilled`).
  - After **entitlement/membership grant**.
- **Driver:** the platform's email adapter is console-only today (`getEmail()` from `src/adapters/types.ts`). v1 wires the trigger and emits via the console adapter; swapping a real driver is out of v1 scope. The `email.ts` module calls `getEmail()` so a real driver is a later drop-in.
- **Deep link:** each request email carries `{ targetType, targetId, deepLink }` so the recipient lands directly on the reviewable target's review form.

---

## 10. REST API conventions (grounding)

- Review platforms universally expose a list endpoint with filters (`targetType`, `targetId`, `status`, `rating`, sort) and item endpoints for moderation actions. The platform's existing `/api/v1/products` envelope (`{ok:true,data}|{ok:false,error}`) matches the de-facto JSON-API-lite style most review SaaSes use. The reviews API mirrors it 1:1.

---

## 11. Decision ledger (what the research changed vs. confirmed)

| Topic | Research finding | v1 decision |
|---|---|---|
| Scale | 5-star standard | 1–5 integer, half-stars deferred |
| Verification | Verified-purchase lifts conversion + FTC compliance | Computed `verified` field, not manual |
| Data model | Polymorphic is standard for growing type sets | `targetType`/`targetId` string (mirror `block_sets`) |
| Moderation | Hybrid+ML is modern | Simple pre/post toggle + manual queue; ML deferred |
| Aggregation | Weighted/decayed is modern | Simple mean+count cached, recompute on status change |
| Display | Summary + sort + list + reply + vote | Matches industry pattern 1:1 |
| Course | Completion-gated featured reviews | Enrollment-gated; completion deferred; `meta` holds extras |
| Comment-only | Patreon hearts not stars | `allowRating=false` → `rating=0`, same machinery |
| Email | Post-transaction request email | Trigger on fulfillment + entitlement grant |
| API | List + item + moderation actions | Mirror `/api/v1/products` envelope |
