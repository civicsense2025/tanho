import { randomUUID } from "node:crypto";
import type { MongoMigration } from "../../migrate-runner-mongodb";

/** See migrations/libsql/backfill_legacy_data.ts for the full rationale. Mongo has no
 * "does this collection exist" ambiguity to guard against the way SQL does -- an empty or
 * missing collection's find() just yields zero documents, so each backfill below is naturally
 * a no-op when there's nothing to migrate, with no separate guard needed. */

async function typeIdFor(db: import("mongodb").Db, slug: string): Promise<string | undefined> {
  const type = await db.collection("content_types").findOne({ slug });
  return type?.id as string | undefined;
}

async function alreadyBackfilled(db: import("mongodb").Db, contentTypeId: string, slug: string): Promise<boolean> {
  return Boolean(await db.collection("content_entries").findOne({ contentTypeId, slug }));
}

export const backfillLegacyData: MongoMigration = {
  name: "backfill_legacy_data",
  async run(db) {
    const now = new Date().toISOString();

    const projectTypeId = await typeIdFor(db, "project");
    if (projectTypeId) {
      const projects = await db.collection("projects").find({}).toArray();
      for (const p of projects) {
        if (await alreadyBackfilled(db, projectTypeId, p.slug as string)) continue;
        const blocks = await db.collection("project_blocks").find({ projectId: p.id }).sort({ sortOrder: 1 }).toArray();
        await db.collection("content_entries").insertOne({
          id: randomUUID(), contentTypeId: projectTypeId, slug: p.slug, title: p.title, status: p.status ?? "draft",
          scheduledAt: null, publishedAt: null, sortOrder: p.sortOrder ?? 0,
          seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
          data: JSON.stringify({
            tagline: p.tagline ?? null, coverImage: p.coverImage ?? null, logoUrl: p.logoUrl ?? null,
            tags: p.tags ? JSON.parse(p.tags as string) : [], githubUrl: p.githubUrl ?? null, liveUrl: p.liveUrl ?? null, year: p.year ?? null,
            blocks: blocks.map((b) => ({ type: b.type, content: JSON.parse(b.content as string), sortOrder: b.sortOrder })),
          }),
          createdAt: p.createdAt ?? now, updatedAt: p.updatedAt ?? now,
        });
      }
    }

    const guideTypeId = await typeIdFor(db, "guide");
    if (guideTypeId) {
      const guides = await db.collection("guides").find({}).toArray();
      for (const g of guides) {
        if (await alreadyBackfilled(db, guideTypeId, g.slug as string)) continue;
        const steps = await db.collection("guide_steps").find({ guideId: g.id }).sort({ sortOrder: 1 }).toArray();
        await db.collection("content_entries").insertOne({
          id: randomUUID(), contentTypeId: guideTypeId, slug: g.slug, title: g.title, status: g.status ?? "draft",
          scheduledAt: null, publishedAt: null, sortOrder: g.sortOrder ?? 0,
          seoTitle: g.seoTitle ?? null, seoDescription: g.seoDescription ?? null, ogImage: g.ogImage ?? null, canonicalUrl: g.canonicalUrl ?? null, noIndex: g.noIndex ?? 0,
          data: JSON.stringify({
            tagline: g.tagline ?? null, summary: g.summary ?? null, sourcePlatform: g.sourcePlatform ?? null, targetPlatform: g.targetPlatform ?? null,
            difficulty: g.difficulty ?? null, effortHoursMin: g.effortHoursMin ?? null, effortHoursMax: g.effortHoursMax ?? null,
            costMinUsd: g.costMinUsd ?? null, costMaxUsd: g.costMaxUsd ?? null, costPeriod: g.costPeriod ?? null,
            skillsRequired: g.skillsRequired ? JSON.parse(g.skillsRequired as string) : [],
            requirements: g.requirements ? JSON.parse(g.requirements as string) : [],
            coverImage: g.coverImage ?? null,
            blocks: steps.map((s) => ({ type: s.type, content: JSON.parse(s.content as string), sortOrder: s.sortOrder })),
          }),
          createdAt: g.createdAt ?? now, updatedAt: g.updatedAt ?? now,
        });
      }
    }

    const postTypeId = await typeIdFor(db, "post");
    if (postTypeId) {
      const posts = await db.collection("posts").find({}).toArray();
      for (const po of posts) {
        if (await alreadyBackfilled(db, postTypeId, po.slug as string)) continue;
        await db.collection("content_entries").insertOne({
          id: randomUUID(), contentTypeId: postTypeId, slug: po.slug, title: po.title, status: po.status ?? "draft",
          scheduledAt: null, publishedAt: po.publishedAt ?? null, sortOrder: po.sortOrder ?? 0,
          seoTitle: po.seoTitle ?? null, seoDescription: po.seoDescription ?? null, ogImage: po.ogImage ?? null, canonicalUrl: po.canonicalUrl ?? null, noIndex: po.noIndex ?? 0,
          data: JSON.stringify({ subtitle: po.subtitle ?? null, excerpt: po.excerpt ?? null, coverImage: po.coverImage ?? null, visibility: po.visibility ?? "public", body: "" }),
          createdAt: po.createdAt ?? now, updatedAt: po.updatedAt ?? now,
        });
      }
    }

    const pageTypeId = await typeIdFor(db, "page");
    if (pageTypeId) {
      const pages = await db.collection("pages").find({}).toArray();
      for (const pg of pages) {
        if (await alreadyBackfilled(db, pageTypeId, pg.slug as string)) continue;
        await db.collection("content_entries").insertOne({
          id: randomUUID(), contentTypeId: pageTypeId, slug: pg.slug, title: pg.title, status: pg.status ?? "draft",
          scheduledAt: null, publishedAt: null, sortOrder: pg.sortOrder ?? 0,
          seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
          data: JSON.stringify({ blocks: [] }),
          createdAt: pg.createdAt ?? now, updatedAt: pg.updatedAt ?? now,
        });
      }
    }

    const resourceTypeId = await typeIdFor(db, "resource");
    if (resourceTypeId) {
      const resources = await db.collection("resources").find({}).toArray();
      for (const r of resources) {
        // Resource never had a slug (title/url instead) -- matched for idempotency by URL.
        const existing = await db.collection("content_entries").findOne({ contentTypeId: resourceTypeId, "data": { $regex: JSON.stringify(r.url).slice(1, -1) } });
        if (existing) continue;
        await db.collection("content_entries").insertOne({
          id: randomUUID(), contentTypeId: resourceTypeId, slug: randomUUID().slice(0, 8), title: r.title, status: r.status ?? "draft",
          scheduledAt: null, publishedAt: null, sortOrder: 0,
          seoTitle: r.seoTitle ?? null, seoDescription: r.seoDescription ?? null, ogImage: r.ogImage ?? null, canonicalUrl: r.canonicalUrl ?? null, noIndex: r.noIndex ?? 0,
          data: JSON.stringify({ url: r.url, sourceName: r.sourceName ?? null, summary: r.summary ?? null, resourceType: r.resourceType ?? null, internalNotes: r.internalNotes ?? null, isPublic: r.isPublic ?? 1 }),
          createdAt: r.createdAt ?? now, updatedAt: r.updatedAt ?? now,
        });
      }
    }
  },
};
