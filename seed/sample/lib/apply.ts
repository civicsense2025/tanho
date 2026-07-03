import { eq } from "drizzle-orm";
import { people, personActivity } from "../../../src/modules/people/schema";
import { eventTypes } from "../../../src/modules/scheduling/schema";
import { log, type SeedDb } from "../../lib";
import { upsertPage } from "../../demo/demo-page-helpers";
import { upsertEntry } from "../../demo/demo-entry-helper";
import { applySettings } from "./apply-settings";
import { applyShop } from "./apply-shop";
import { validateNav } from "./validate-nav";
import type { SamplePack } from "./types";

/**
 * Turn a SamplePack into a complete, explorable install. Order matters:
 * pages/entries/shop first (so their routes exist), THEN nav validation, THEN
 * settings/menu/chrome (which reference those routes). Everything is idempotent,
 * so re-running a sample — or switching industries — cleanly overwrites.
 *
 * Gated features are deliberately left in their locked/unconfigured state:
 * ecommerce stays locked (products seed but the store shows "enable me"),
 * payments/AI stay unconfigured. Set SAMPLE_UNLOCK=1 to also flip ecommerce on
 * and explore the unlocked storefront.
 */
export async function applySamplePack(db: SeedDb, pack: SamplePack): Promise<void> {
  log(`\n── Applying sample: ${pack.meta.brand} (${pack.meta.key}) ──`);

  // Fail fast if any nav link would 404 — a sample must be internally consistent.
  validateNav(pack);

  // Pages + posts. Two passes so a post can parent under a page by slug.
  const pageIdBySlug = new Map<string, string>();
  for (const p of pack.pages.filter((x) => (x.kind ?? "page") === "page")) {
    pageIdBySlug.set(p.slug, await upsertPage(db, { ...p, parentId: null }));
  }
  for (const p of pack.pages.filter((x) => x.kind === "post")) {
    const parentId = p.parentSlug ? (pageIdBySlug.get(p.parentSlug) ?? null) : null;
    pageIdBySlug.set(p.slug, await upsertPage(db, { ...p, parentId }));
  }

  // CMS entries (projects / guides / hubs / resources).
  for (const e of pack.entries ?? []) {
    await upsertEntry(db, e.type, e.slug, e.title, e.data, {
      status: e.status,
      sortOrder: e.sortOrder,
      blocks: e.blocks,
    });
  }

  // Shop content (store left locked).
  if (pack.shop) await applyShop(db, pack.shop);

  // Sample CRM people (fictional — no real PII).
  for (const person of pack.people ?? []) {
    const existing = await db.query.people.findFirst({ where: eq(people.email, person.email) });
    if (existing) continue;
    const [row] = await db
      .insert(people)
      .values({
        email: person.email,
        name: person.name,
        kind: person.kind,
        status: person.status ?? "active",
      })
      .returning({ id: people.id });
    await db.insert(personActivity).values({
      personId: row!.id,
      type: "note",
      label: "Added by sample seed",
    });
  }

  // Bookable event types. A price>0 exercises the paid-booking gated path
  // (locked until Stripe is configured); free ones work immediately.
  for (const et of pack.eventTypes ?? []) {
    const existing = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, et.slug) });
    const values = {
      slug: et.slug,
      name: et.name,
      durationMin: et.durationMin,
      priceCents: et.priceCents,
      description: et.description,
      locations: et.locations,
      active: true,
    };
    if (existing) {
      await db.update(eventTypes).set(values).where(eq(eventTypes.id, existing.id));
    } else {
      await db.insert(eventTypes).values(values);
    }
  }

  // Settings + menu + chrome LAST, referencing the routes seeded above.
  await applySettings(db, pack);

  log(`✓ sample "${pack.meta.brand}" applied — ${pack.pages.length} pages, ${(pack.entries ?? []).length} entries, ${(pack.shop?.products ?? []).length} products\n`);
}
