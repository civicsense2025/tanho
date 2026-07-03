# Database test plan

A working checklist for exercising every content type, action, and cascade in the
oys-platform schema. Grounded in the actual `actions.ts` exports per module (not
generic CRUD guesses) — each item names the real function so a failure points
straight at code. Written after the July 2026 legacy-table cleanup, so section 15
(portability) matters more than usual: it's the first real test of export/import
since the schema was reconciled.

Test against a throwaway Turso branch or `./data/dev.db` if you can — several
items here are deliberately destructive (delete guards, cascade behavior).

---

## 0. Before you start

- [ ] Confirm which DB you're pointed at: `echo $DATABASE_URL` (or check `.env.local`'s `TURSO_DATABASE_URL`) — don't run destructive tests against production data by accident.
- [ ] Run `npx drizzle-kit studio` or a quick row-count query as a baseline snapshot before mutating anything.
- [ ] Confirm `npm run typecheck` and `npm run lint` are clean on current `main` before you start, so any failure you hit later is a runtime issue, not a pre-existing one.

---

## 1. Generic entries — guide / project / resource

Uses `createEntry` / `updateEntry` / `deleteEntry` / `saveEntryDraftBlocks` / `publishEntryBlocks` (`src/modules/entries/actions.ts`).

- [ ] Create a `guide` entry with a slug that already exists for that type — confirm `createEntry` rejects it with "Slug ... is already in use" (checks `type`+`slug` uniqueness, not slug alone — a `guide` and `project` can share a slug).
- [ ] Create a `guide` entry with `data` that fails its Zod schema (e.g. missing `tagline`) — confirm the specific validation message surfaces, not a generic 500.
- [ ] Create a valid `project` and a valid `resource` entry — confirm both appear in their respective admin grids (`/admin/content/projects`, `/admin/content/resources`).
- [ ] Update an entry's `type` via `updateEntry` — confirm it's silently ignored (`type` is deliberately immutable post-creation; verify the row's `type` really didn't change in the DB, not just that no error was thrown).
- [ ] Rename an entry's slug to one already used by another entry of the *same* type — confirm rejection. Rename it to a slug used by a *different* type — confirm it succeeds (slug uniqueness is scoped per-type).
- [ ] Save draft blocks (`saveEntryDraftBlocks`) with an invalid block tree — confirm `validateBlockTree` rejects it before it hits the DB.
- [ ] Save valid draft blocks, then `publishEntryBlocks` — confirm a `published` variant row appears in `block_sets` and matches the draft.
- [ ] Publish, then edit the draft again without republishing — confirm the public page still serves the last *published* variant, not the newer draft.
- [ ] Delete an entry (`deleteEntry`) that has both draft and published block_sets rows — confirm both are deleted (query `block_sets where owner_type='entry:<type>' and owner_id='<id>'` returns zero rows after).
- [ ] Delete an entry that was never published (draft-only) — confirm no error.
- [ ] Check `audit_log` after each create/update/delete/publish above — confirm a row was written with the right `action` (`entry.create`, `entry.update`, `entry.delete`, `entry.publish`) and `ownerId`.

## 2. Taxonomy entries — hub / platform / matrix_pair

Same `entries` actions, but `taxonomy: true` in the registry — these are hidden from the normal content grids and managed via the guides taxonomy UI/seed instead.

- [ ] Create a new `platform` entry, then create a `guide` whose `data.source_platform` or `data.target_platform` references its slug — confirm the guide renders the platform's name/link correctly.
- [ ] **Referential-integrity gap to confirm**: delete that `platform` entry while a `guide` still references its slug in `data.source_platform`. There is no FK — `source_platform`/`target_platform` are plain strings, not entry IDs. Confirm the guide still renders (doesn't 500) but the platform badge/link now points at nothing. Decide if this needs a delete-guard like `custom_types` has (see 2a below) or just a documented gap.
- [ ] Create a `matrix_pair` entry and confirm it surfaces wherever the stack-comparison matrix reads from (`entries` type `matrix_pair`).
- [ ] Create a `hub` entry and confirm it appears as a hub grouping on the guides landing page.

## 2a. Custom content types

`saveCustomType` / `deleteCustomType` (`src/modules/custom-types/actions.ts`), builder logic in `builder.ts` (has a `builder.test.ts` — run it: `npx vitest run src/modules/custom-types/builder.test.ts`).

- [ ] Create a custom type via the admin Types screen (`/admin/content/types`) with a mix of field types — confirm it's usable immediately as `custom:<slug>` without a migration or restart.
- [ ] Create an entry of that new `custom:<slug>` type through `createEntry` — confirm `data` validates against the dynamically-built field schema.
- [ ] Attempt `deleteCustomType` while at least one entry of that type still exists — confirm it's **blocked** ("Cannot delete: N entries still use this type"). This guard exists; contrast it against platform/tag deletes above and below, which don't have one.
- [ ] Delete the blocking entry first, then `deleteCustomType` again — confirm it now succeeds.
- [ ] Toggle a built-in type off via `toggleContentType` (`content-types-actions.ts`) — confirm it disappears from the public sitemap (`src/app/sitemap.ts` checks `isTypeDisabled`) and from wherever else reads `content_types` settings, but existing entries aren't deleted, just hidden.

## 3. Pages, menus, redirects

- [ ] `createPage`, `savePageDetails`, `saveDraftBlocks`, `publishPage`, `deletePage` (`src/modules/pages/actions.ts`) — same draft/publish lifecycle as entries; confirm a fresh page 404s publicly until `publishPage` runs.
- [ ] Create a page at a route that collides with an existing static route (e.g. `/guides`) — confirm collision handling (reject, or last-write-wins — check which, since this is a real footgun for a white-label product).
- [ ] `createMenu` / `saveMenu` / `deleteMenu` (`src/modules/menus/actions.ts`) — add a menu item pointing at a page you're about to delete, then delete the page. Confirm the menu doesn't error, just links to a 404 (no referential guard expected here either — worth confirming).
- [ ] `saveRedirect` / `deleteRedirect` (`src/modules/redirects/actions.ts`) — create a redirect loop (A→B, B→A) and confirm the app doesn't infinite-loop resolving it.
- [ ] Create a redirect for a path that's also a live page/entry route — confirm precedence (does the real page win, or the redirect?).

## 4. Media library

`uploadMedia` / `updateMedia` / `deleteMedia` / `listImageMediaAction` (`src/modules/media/actions.ts`); usage tracking via `rebuildMediaUsage`.

- [ ] Upload an image, insert it into a guide's block content, publish — confirm a `media_usage` row appears linking the media to that entry's route.
- [ ] Upload a second image but never use it anywhere — confirm it shows as unused in the media picker/library (0 usage rows).
- [ ] `deleteMedia` on the **used** image from the first step — confirm it deletes the storage file *and* the `media_usage` rows without checking whether anything still references it. This mirrors the platform-delete gap: the published block still has the old `logo_media_id`/image reference, but the file and DB row are gone. Confirm the public page breaks gracefully (broken image, not a 500) rather than crashing the render.
- [ ] Set an image as the site logo (`logo_media_id` in `theme`) or a product image, then delete that media row directly — confirm the same dangling-reference behavior.
- [ ] Re-publish the entry that used the deleted image (`publishEntryBlocks` triggers `rebuildMediaUsage`) — confirm the stale `media_usage` row for the missing media either self-heals or errors clearly.

## 5. Tags

`createTag` / `renameTag` / `deleteTag` (`src/modules/tags/actions.ts`).

- [ ] Create a tag, apply it to a few entries via `taggings`, then `deleteTag` — confirm `taggings` rows are cascade-deleted (`deleteTag` does this explicitly, not via a DB-level FK cascade — confirm it actually clears all of them, not just the first).
- [ ] `renameTag` to a name that collides with an existing tag — confirm rejection or merge behavior (check which the code actually does).
- [ ] Confirm deleting a tag doesn't touch the entries it was applied to (only the junction row).

## 6. Commerce

Products/variants: `createProduct`, `updateProduct`, `deleteProduct`, `addVariant`, `updateVariant`, `removeVariant`, `setProductCollections` (`product-actions.ts`). Collections: `createCollection`, `updateCollection`, `deleteCollection`, `addProductToCollection`, `removeProductFromCollection` (`collection-actions.ts`). Orders: `fulfillOrder`, `refundOrder` (`order-actions.ts`). Shipping: `createShippingZone`, `updateShippingZone`, `deleteShippingZone` (`shipping-actions.ts`). Checkout: `startCheckout` (`checkout-actions.ts`).

- [ ] Create a product with inventory tracking on, set `inventory: 0`, `allowBackorder: false` — confirm checkout blocks it.
- [ ] Same with `allowBackorder: true` — confirm checkout allows it through.
- [ ] Add multiple variants to a product, `removeVariant` on one mid-cart (simulate a stale cart) — confirm the order/checkout path handles a vanished variant without crashing.
- [ ] `deleteProduct` on a product that has *existing orders* referencing it via `order_items.productId` — confirm this doesn't cascade-delete or orphan historical order line items (order history should survive product deletion; check whether `order_items.productId` is nullable/preserved).
- [ ] `addProductToCollection` / `removeProductFromCollection` — confirm the `product_collections` join table updates correctly and `deleteCollection` doesn't leave orphaned join rows.
- [ ] Run a real Stripe test-mode checkout end to end (`startCheckout`) — confirm a `stripe_events` row is written on webhook receipt and is idempotent (replay the same webhook payload, confirm no duplicate order).
- [ ] `fulfillOrder` with a tracking number, then `refundOrder` on the same order — confirm status transitions are sane (`pending → paid → unfulfilled → fulfilled`, `→ refunded`/`disputed`/`cancelled`) and you can't refund an already-refunded order.
- [ ] `createShippingZone` with overlapping country lists across two zones — confirm checkout picks one deterministically, not randomly.
- [ ] Trigger a dispute (Stripe test dispute) — confirm a `disputes` row is created and linked to the right `order_id`.

## 7. People, memberships, newsletter

Admin: `updatePerson`, `addTag`/`removeTag`, `deletePeople` (bulk), `inviteMember`, `approveMember`, `grantMembership`, `removeMembership`, `exportPeopleCsv`, `deletePerson`, `impersonate` (`people/admin-actions.ts`). Self-service: `joinAction`, `signinAction`, `verifyEmailAction`, `signoutAction`, `selfExportAction` (`account-actions.ts`). Newsletter: `subscribeAction`, `confirmSubscriptionAction`, `unsubscribeAction` (`newsletter-actions.ts`).

- [ ] `joinAction` with an email already in `people` — confirm it doesn't create a duplicate row (check the natural key — likely email).
- [ ] `verifyEmailAction` with an expired or already-used token — confirm it fails cleanly, not silently succeeds.
- [ ] `grantMembership` then `removeMembership` — confirm `memberships` rows are actually removed/expired, not just hidden, and that billing access (if gated) is revoked immediately.
- [ ] `deletePeople` (bulk) on a person who has an active membership and order history — decide/confirm: does this cascade-delete their orders (breaking your own commerce records), anonymize, or block the delete? This is a real GDPR-adjacent decision worth deliberately testing, not assuming.
- [ ] `selfExportAction` — confirm the exported bundle actually contains that person's real data (orders, subscriptions, activity) and nothing belonging to other people.
- [ ] `impersonate` — confirm it's properly gated to owner/admin role and writes an audit log entry (impersonation without an audit trail is a real risk).
- [ ] `subscribeAction` → `confirmSubscriptionAction` (double opt-in) → `unsubscribeAction` — confirm the full newsletter lifecycle, and that an unconfirmed subscriber doesn't receive sends.
- [ ] `exportPeopleCsv` with a large segment — spot-check the CSV against the DB for a few rows (encoding, delimiter, PII columns present/absent as expected).

## 8. Auth & security

`loginAction` / `logoutAction` (`auth/actions.ts`); `login_attempts` table backs rate limiting.

- [ ] Fail login 5+ times in a row with the same email — confirm `login_attempts` throttles further attempts (lockout window, not unlimited retries).
- [ ] Successful login after a failed streak — confirm the `login_attempts` counter resets.
- [ ] `logoutAction` — confirm the session is actually invalidated server-side (`sessions` row removed/expired), not just the client cookie cleared — try reusing the old session token after logout.
- [ ] Confirm `requireUser("owner")`-gated actions (e.g. `deleteCustomType`, `impersonate`) actually reject a non-owner session, not just hide the UI button.

## 9. Theme & branding

`saveTheme`, `saveAsTheme`, `activateTheme`, `duplicateTheme`, `renameTheme`, `deleteTheme`, `importTheme` (`theme/actions.ts`).

- [ ] `saveAsTheme` to create a preset, `activateTheme` on a different preset, then `deleteTheme` the one you just moved away from — confirm you can't delete the *currently active* theme (or if you can, confirm the site doesn't break with no active theme).
- [ ] `duplicateTheme` — confirm the copy is fully independent (editing the duplicate doesn't mutate the original).
- [ ] `importTheme` with malformed JSON — confirm a clean validation error, not a crash.
- [ ] `renameTheme` to a name colliding with an existing preset — confirm behavior (reject vs. allow duplicates).

## 10. Settings

`saveSettings` (general), plus per-area actions: `saveAiCrawlers`, `saveAiKey`/`disconnectAiKey`, `savePolicy`/`deletePolicy`, `saveGa4PropertyId`/`saveGscSiteUrl`/`disconnectGa`/`disconnectGsc`.

- [ ] Save general settings with an invalid site URL — confirm validation catches it before it's written to the `settings` namespace row.
- [ ] `savePolicy` (privacy/terms/etc.), then `deletePolicy` — confirm the public policy page 404s cleanly afterward rather than showing stale content.
- [ ] `saveAiKey` with an invalid/expired API key — confirm the connection test actually calls out and fails, rather than accepting any string.
- [ ] `disconnectAiKey` / `disconnectGa` / `disconnectGsc` / `disconnectIntegration` — confirm the stored credential is actually cleared (query the `settings`/`integration_connections` row after), not just the UI showing "disconnected."

## 11. Scheduling

`saveEventType`, `deleteEventType`, `setEventTypeActive`, `saveAvailability`, `saveExtensions`, `saveTemplates`, `adminCancelBooking`, `resendConfirmation` (`admin-actions.ts`); `availableSlots`, `createBooking`, `cancelBooking`, `rescheduleBooking` (`booking-actions.ts`).

- [ ] `createBooking` for a slot, then immediately try to book the same slot again via a second `createBooking` call — confirm double-booking is prevented (race condition worth testing with near-simultaneous requests, not just sequential).
- [ ] `deleteEventType` while it has upstream `bookings` referencing it — confirm existing bookings survive (historical record) even if the type is gone, or confirm the delete is blocked like `deleteCustomType`.
- [ ] `rescheduleBooking` to a slot that's already taken — confirm rejection.
- [ ] `cancelBooking` (self-service, by code) vs `adminCancelBooking` — confirm both actually free up the slot for rebooking.
- [ ] `resendConfirmation` — confirm it doesn't create a duplicate booking, just re-sends.
- [ ] `setEventTypeActive(false)` — confirm `availableSlots` stops returning slots for it immediately (cache invalidation check).

## 12. AI crawlers / SEO surface

`saveAiCrawlers`, `suggestAltTextAction`, `suggestSeoAction`, `summarizePostAction` (`ai-crawlers/`).

- [ ] Toggle crawler permissions off for a provider, then check `/robots.txt` and `llms.txt` output reflect it immediately (cache-tag invalidation).
- [ ] Run `suggestAltTextAction` on an image with no AI key connected — confirm a clear "not connected" error, not a hang or generic failure.
- [ ] Confirm `SEO_CONTENT_TYPES`-gated pages respect the same `content_types` disabled-set as the sitemap (from item 2a) — a disabled type shouldn't get SEO templates generated for it either.

## 13. Analytics

- [ ] Fire a real pageview/event on the public site — confirm a row lands in `analytics_events` with a `sessionId` but no PII (per the module's own "deliberately minimal and PII-free" comment — verify that claim holds under a real request, e.g. no raw IP or user-agent fingerprint leaking into `props`).
- [ ] Confirm `personId` is only set on `analytics_events` rows when the request came from a logged-in session, and is null for anonymous traffic.

## 14. Forms

`createForm`, `updateForm`, `deleteForm`, `duplicateForm` (`forms/actions.ts`); `submitForm` (`submit-actions.ts`).

- [ ] `duplicateForm` — confirm the copy gets a new slug/id and doesn't share `form_responses` with the original.
- [ ] `submitForm` against a form with required-field validation — confirm server-side validation exists independent of client-side (submit with required fields stripped via a raw request, not just the UI).
- [ ] `deleteForm` on a form with existing `form_responses` — confirm whether responses are cascade-deleted or preserved (decide if that's the right call for your data-retention needs).
- [ ] Submit the same form twice rapidly — check for a duplicate-submission guard (or confirm there isn't one, if that's acceptable for this form type).

## 15. Portability — export / import (test this thoroughly)

`buildSiteExport` / `applySiteImport` (`src/modules/portability/`), backed by `TABLES` in `table-registry.ts` and per-table natural keys in `natural-keys.ts`. This is the module most exposed to the recent legacy-table cleanup — the whole point of `table-registry.ts` is that it's typed against `schema` exports, so a stale/missing table here is a compile error, not a silent gap. Still worth confirming end to end.

- [ ] Run a full export with `includePeople: true` — confirm every one of the 24 tables in `TABLES` (settings, theme, themePresets, pages, blockSets, entries, collections, products, productVariants, productCollections, menus, forms, policies, redirects, profile, customTypes, tags, taggings, media, shippingZones, people, personActivity, memberships, emailSubscriptions) actually produces rows in the bundle where the live DB has rows — spot check counts against direct DB queries.
- [ ] Run an export with `includePeople: false` — confirm none of `people`/`personActivity`/`memberships`/`emailSubscriptions` leak into the bundle.
- [ ] Confirm the export pulls every file referenced by `media.storageKey` and the archive isn't missing any (compare file count in the archive to `select count(*) from media`).
- [ ] Import the same bundle back into the same DB (`applySiteImport`) — confirm it's truly idempotent: row counts don't double, and `NATURAL_KEYS` upserts correctly rather than erroring on unique-constraint conflicts.
- [ ] Import into a **fresh, empty** DB (migrated but unseeded) — confirm every natural key resolves correctly with no pre-existing rows to match against (this is the real white-label "spin up a new licensed site" path — make sure it actually works, since it's the core of the hub/platform licensing model).
- [ ] Corrupt one row's natural-key column in a bundle (null it out) before importing — confirm `applySiteImport` rejects it with the documented "row missing its key" error rather than throwing a raw NOT NULL DB error.
- [ ] Feed it a bundle with `manifest.format !== BUNDLE_FORMAT` — confirm the explicit "Unsupported bundle format" rejection.
- [ ] After import, confirm FK-dependent data actually resolves — e.g. imported `productCollections` rows still point at valid `products`/`collections` ids post-import, not stale ids from the source DB.
- [ ] Re-run the 11 guide entries + 9 platform entries we seeded through a full export → wipe → import cycle on a throwaway branch, and confirm all `block_sets` (draft + published) come back intact — this is the most direct regression test for the exact content this session created.

## 16. Cross-cutting / known gaps worth deliberately confirming

These aren't necessarily bugs — some are legitimate design choices (string references instead of FKs, no delete guards on tags/media) — but they should be *confirmed intentional*, not just discovered by accident in production:

- [ ] No FK exists between `entries.data.source_platform`/`target_platform` (strings) and the `platform` taxonomy entries they name. Deleting a platform doesn't break anything at the DB level, but silently orphans the reference in guide content. Decide: soft-guard (warn on delete) or leave as-is with a documented convention that platform slugs are stable/append-only.
- [ ] `deleteTag` and `deleteMedia` cascade their junction rows automatically with no "in use" warning, while `deleteCustomType` explicitly blocks deletion when in use. Confirm this asymmetry is intentional (tags/media are low-stakes to lose a reference to; custom types are structural) rather than an oversight.
- [ ] Menus can point at deleted pages/entries with no warning (item 3) — same category of gap.
- [ ] Re-run the `comm -23`/`comm -13` schema-vs-live-tables diff from this session periodically (or better, script it into a `db:audit` npm script) so schema drift gets caught early instead of accumulating for months like the legacy tables did.

## 17. Post-test cleanup

- [ ] If you tested against the real Turso DB, delete every test record you created (products, orders, people, custom types, forms) — grep for an obvious naming convention like `test-` or `TEST_` in your test data up front so cleanup is a single `WHERE slug LIKE 'test-%'` sweep, not manual hunting.
- [ ] Re-run the schema diff (`comm -23`/`comm -13` against `schema.ts`-derived table names) one more time to confirm test cleanup didn't leave any new orphaned tables behind.
- [ ] Re-verify the guide/platform content from this session is still intact (`select count(*) from entries where type in ('guide','platform')`) after all destructive testing above.
