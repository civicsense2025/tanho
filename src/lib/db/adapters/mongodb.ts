import { MongoClient, type Collection, type Db, type Filter } from "mongodb";
import { randomUUID } from "crypto";
import type {
  Award,
  DbAdapter,
  Education,
  Experience,
  Guide,
  GuideFilter,
  GuideStep,
  ListQuery,
  Page,
  Platform,
  Project,
  ProjectBlock,
  Repository,
  Resource,
  SeoEntityType,
  SeoTemplate,
  Skill,
  Tag,
} from "../types";
import { applyMongoMigrations } from "../migrate-runner-mongodb";
import { mongoMigrations } from "../migrations/mongodb";

/**
 * Documents store the app-level string `id` as their own `id` field (not `_id`
 * -- Mongo's ObjectId), so callers never see or reason about ObjectId. `_id`
 * is left to Mongo's own default and simply stripped on the way out.
 */
function mongoRepository<T extends { id: string }>(collection: Collection): Repository<T> {
  function fromDoc(doc: Record<string, unknown>): T {
    const { _id, ...rest } = doc;
    void _id;
    return rest as T;
  }

  return {
    async list(query?: ListQuery<T>) {
      const filter: Filter<Record<string, unknown>> = {};
      if (query?.where) {
        for (const [key, value] of Object.entries(query.where)) {
          if (value && typeof value === "object" && "in" in (value as object)) {
            filter[key] = { $in: (value as { in: unknown[] }).in };
          } else {
            filter[key] = value;
          }
        }
      }
      let cursor = collection.find(filter);
      if (query?.orderBy?.length) {
        const sort: Record<string, 1 | -1> = {};
        for (const o of query.orderBy) sort[o.field as string] = o.direction === "asc" ? 1 : -1;
        cursor = cursor.sort(sort);
      }
      if (query?.offset) cursor = cursor.skip(query.offset);
      if (query?.limit) cursor = cursor.limit(query.limit);
      const docs = await cursor.toArray();
      return docs.map((d) => fromDoc(d as Record<string, unknown>));
    },

    async get(id: string) {
      const doc = await collection.findOne({ id });
      return doc ? fromDoc(doc as Record<string, unknown>) : undefined;
    },

    async create(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const doc = { id, ...data, createdAt: now, updatedAt: now };
      await collection.insertOne(doc as never);
      return (await this.get(id))!;
    },

    async update(id: string, data) {
      const update: Record<string, unknown> = { ...data };
      update.updatedAt = new Date().toISOString();
      await collection.updateOne({ id }, { $set: update });
      return (await this.get(id))!;
    },

    async delete(id: string) {
      await collection.deleteOne({ id });
    },
  };
}

export function createMongoAdapter(): DbAdapter {
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error("MONGODB_URL must be set when DB_PROVIDER=mongodb");
  const client = new MongoClient(url);
  const dbName = process.env.MONGODB_DB || "cms";
  let db: Db;

  function getDb(): Db {
    if (!db) db = client.db(dbName);
    return db;
  }

  const projects = mongoRepository<Project>(getDb().collection("projects"));
  const experience = mongoRepository<Experience>(getDb().collection("experience"));
  const skills = mongoRepository<Skill>(getDb().collection("skills"));
  const awards = mongoRepository<Award>(getDb().collection("awards"));
  const education = mongoRepository<Education>(getDb().collection("education"));
  const pages = mongoRepository<Page>(getDb().collection("pages"));
  const guides = mongoRepository<Guide>(getDb().collection("guides"));
  const platforms = mongoRepository<Platform>(getDb().collection("platforms"));
  const tags = mongoRepository<Tag>(getDb().collection("tags"));
  const resources = mongoRepository<Resource>(getDb().collection("resources"));

  async function getProjectBlocks(projectId: string): Promise<ProjectBlock[]> {
    const docs = await getDb()
      .collection("project_blocks")
      .find({ projectId })
      .sort({ sortOrder: 1 })
      .toArray();
    return docs.map((d) => ({
      id: d.id as string,
      projectId: d.projectId as string,
      type: d.type as ProjectBlock["type"],
      content: d.content as string,
      sortOrder: d.sortOrder as number,
    }));
  }

  async function replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
    const collection = getDb().collection("project_blocks");
    await collection.deleteMany({ projectId });
    if (blocks.length === 0) return;
    await collection.insertMany(
      blocks.map((b, i) => ({ id: randomUUID(), projectId, type: b.type, content: b.content, sortOrder: i }))
    );
  }

  async function getGuideSteps(guideId: string): Promise<GuideStep[]> {
    const docs = await getDb().collection("guide_steps").find({ guideId }).sort({ sortOrder: 1 }).toArray();
    return docs.map((d) => ({
      id: d.id as string,
      guideId: d.guideId as string,
      title: (d.title as string) ?? null,
      type: d.type as GuideStep["type"],
      content: d.content as string,
      sortOrder: d.sortOrder as number,
    }));
  }

  async function replaceGuideSteps(guideId: string, steps: Omit<GuideStep, "id" | "guideId">[]): Promise<void> {
    const collection = getDb().collection("guide_steps");
    await collection.deleteMany({ guideId });
    if (steps.length === 0) return;
    await collection.insertMany(
      steps.map((s, i) => ({ id: randomUUID(), guideId, title: s.title, type: s.type, content: s.content, sortOrder: i }))
    );
  }

  /** guide_tags is modeled as its own collection of plain {guideId, tagId} docs, matching this
   * file's existing style (no aggregation pipelines where two simple queries will do). */
  async function getGuideTags(guideId: string): Promise<Tag[]> {
    const joins = await getDb().collection("guide_tags").find({ guideId }).toArray();
    const tagIds = joins.map((j) => j.tagId as string);
    if (tagIds.length === 0) return [];
    const docs = await getDb().collection("tags").find({ id: { $in: tagIds } }).sort({ name: 1 }).toArray();
    return docs.map((d) => ({ id: d.id as string, slug: d.slug as string, name: d.name as string }));
  }

  async function setGuideTags(guideId: string, tagIds: string[]): Promise<void> {
    const collection = getDb().collection("guide_tags");
    await collection.deleteMany({ guideId });
    if (tagIds.length === 0) return;
    await collection.insertMany(tagIds.map((tagId) => ({ guideId, tagId })));
  }

  function platformFromDoc(d: Record<string, unknown>): Platform {
    return {
      id: d.id as string,
      slug: d.slug as string,
      name: d.name as string,
      kind: d.kind as Platform["kind"],
      category: (d.category as string) ?? null,
      logoUrl: (d.logoUrl as string) ?? null,
      description: (d.description as string) ?? null,
      sortOrder: d.sortOrder as number,
      officialUrl: (d.officialUrl as string) ?? null,
      isOpenSource: d.isOpenSource as number,
      pricingModel: (d.pricingModel as Platform["pricingModel"]) ?? null,
      pricingNotes: (d.pricingNotes as string) ?? null,
      githubUrl: (d.githubUrl as string) ?? null,
    };
  }

  /** resource_platforms is modeled as its own collection of plain {resourceId, platformId} docs. */
  async function getPlatformsForResource(resourceId: string): Promise<Platform[]> {
    const joins = await getDb().collection("resource_platforms").find({ resourceId }).toArray();
    const platformIds = joins.map((j) => j.platformId as string);
    if (platformIds.length === 0) return [];
    const docs = await getDb().collection("platforms").find({ id: { $in: platformIds } }).sort({ name: 1 }).toArray();
    return docs.map((d) => platformFromDoc(d as Record<string, unknown>));
  }

  async function setResourcePlatforms(resourceId: string, platformIds: string[]): Promise<void> {
    const collection = getDb().collection("resource_platforms");
    await collection.deleteMany({ resourceId });
    if (platformIds.length === 0) return;
    await collection.insertMany(platformIds.map((platformId) => ({ resourceId, platformId })));
  }

  function resourceFromDoc(d: Record<string, unknown>): Resource {
    return {
      id: d.id as string,
      title: d.title as string,
      url: d.url as string,
      sourceName: (d.sourceName as string) ?? null,
      summary: (d.summary as string) ?? null,
      resourceType: d.resourceType as Resource["resourceType"],
      internalNotes: (d.internalNotes as string) ?? null,
      isPublic: d.isPublic as number,
      status: d.status as Resource["status"],
      seoTitle: (d.seoTitle as string) ?? null,
      seoDescription: (d.seoDescription as string) ?? null,
      ogImage: (d.ogImage as string) ?? null,
      canonicalUrl: (d.canonicalUrl as string) ?? null,
      noIndex: (d.noIndex as number) ?? 0,
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
    };
  }

  async function getResourcesForPlatform(platformSlug: string, publicOnly = true): Promise<Resource[]> {
    const platformDoc = await getDb().collection("platforms").findOne({ slug: platformSlug });
    if (!platformDoc) return [];
    const joins = await getDb().collection("resource_platforms").find({ platformId: platformDoc.id }).toArray();
    const resourceIds = joins.map((j) => j.resourceId as string);
    if (resourceIds.length === 0) return [];
    const filter: Filter<Record<string, unknown>> = { id: { $in: resourceIds } };
    if (publicOnly) { filter.isPublic = 1; filter.status = "published"; }
    const docs = await getDb().collection("resources").find(filter).sort({ createdAt: -1 }).toArray();
    return docs.map((d) => resourceFromDoc(d as Record<string, unknown>));
  }

  /** guide_resources is modeled as its own collection of {guideId, resourceId, sortOrder} docs -- a
   * many-to-many join with a payload, so it keeps its own sort order rather than being folded into
   * the plain-join style used for guide_tags/resource_platforms. */
  async function getResourcesForGuide(guideId: string, publicOnly = true): Promise<Resource[]> {
    const joins = await getDb().collection("guide_resources").find({ guideId }).sort({ sortOrder: 1 }).toArray();
    const resourceIds = joins.map((j) => j.resourceId as string);
    if (resourceIds.length === 0) return [];
    const filter: Filter<Record<string, unknown>> = { id: { $in: resourceIds } };
    if (publicOnly) { filter.isPublic = 1; filter.status = "published"; }
    const docs = await getDb().collection("resources").find(filter).toArray();
    const bySortOrder = new Map(joins.map((j) => [j.resourceId as string, j.sortOrder as number]));
    const list = docs.map((d) => resourceFromDoc(d as Record<string, unknown>));
    list.sort((a, b) => (bySortOrder.get(a.id) ?? 0) - (bySortOrder.get(b.id) ?? 0));
    return list;
  }

  async function setGuideResources(guideId: string, resourceIds: string[]): Promise<void> {
    const collection = getDb().collection("guide_resources");
    await collection.deleteMany({ guideId });
    if (resourceIds.length === 0) return;
    await collection.insertMany(resourceIds.map((resourceId, i) => ({ guideId, resourceId, sortOrder: i })));
  }

  function guideFromDoc(d: Record<string, unknown>): Guide {
    return {
      id: d.id as string,
      slug: d.slug as string,
      title: d.title as string,
      tagline: (d.tagline as string) ?? null,
      summary: (d.summary as string) ?? null,
      sourcePlatform: d.sourcePlatform as string,
      targetPlatform: d.targetPlatform as string,
      difficulty: d.difficulty as Guide["difficulty"],
      effortHoursMin: (d.effortHoursMin as number) ?? null,
      effortHoursMax: (d.effortHoursMax as number) ?? null,
      costMinUsd: (d.costMinUsd as number) ?? null,
      costMaxUsd: (d.costMaxUsd as number) ?? null,
      costPeriod: d.costPeriod as Guide["costPeriod"],
      skillsRequired: d.skillsRequired as string,
      requirements: d.requirements as string,
      coverImage: (d.coverImage as string) ?? null,
      status: d.status as Guide["status"],
      sortOrder: d.sortOrder as number,
      seoTitle: (d.seoTitle as string) ?? null,
      seoDescription: (d.seoDescription as string) ?? null,
      ogImage: (d.ogImage as string) ?? null,
      canonicalUrl: (d.canonicalUrl as string) ?? null,
      noIndex: (d.noIndex as number) ?? 0,
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
    };
  }

  const DIFFICULTY_RANK: Record<Guide["difficulty"], number> = { beginner: 0, intermediate: 1, advanced: 2 };

  async function listGuides(filter: GuideFilter = {}): Promise<Guide[]> {
    const mongoFilter: Filter<Record<string, unknown>> = {};
    if (filter.publishedOnly !== false) mongoFilter.status = "published";
    if (filter.sourcePlatform) mongoFilter.sourcePlatform = filter.sourcePlatform;
    if (filter.targetPlatform) mongoFilter.targetPlatform = filter.targetPlatform;
    const docs = await getDb().collection("guides").find(mongoFilter).sort({ sortOrder: 1 }).toArray();
    let list = docs.map((d) => guideFromDoc(d as Record<string, unknown>));
    if (filter.maxDifficulty) {
      const ceiling = DIFFICULTY_RANK[filter.maxDifficulty];
      list = list.filter((g) => DIFFICULTY_RANK[g.difficulty] <= ceiling);
    }
    return list;
  }

  async function getGuideBySlug(slug: string): Promise<Guide | undefined> {
    const [g] = await guides.list({ where: { slug } });
    return g;
  }

  async function getPlatformBySlug(slug: string): Promise<Platform | undefined> {
    const [p] = await platforms.list({ where: { slug } });
    return p;
  }

  async function upsertPlatform(data: Omit<Platform, "id">): Promise<Platform> {
    const collection = getDb().collection("platforms");
    const existing = await collection.findOne({ slug: data.slug });
    const id = (existing?.id as string) ?? randomUUID();
    await collection.updateOne({ slug: data.slug }, { $set: { id, ...data } }, { upsert: true });
    return { id, ...data };
  }

  async function upsertTag(data: Omit<Tag, "id">): Promise<Tag> {
    const collection = getDb().collection("tags");
    const existing = await collection.findOne({ slug: data.slug });
    const id = (existing?.id as string) ?? randomUUID();
    await collection.updateOne({ slug: data.slug }, { $set: { id, ...data } }, { upsert: true });
    return { id, ...data };
  }

  async function listResources(publicOnly = true): Promise<Resource[]> {
    const filter: Filter<Record<string, unknown>> = publicOnly ? { isPublic: 1, status: "published" } : {};
    const docs = await getDb().collection("resources").find(filter).sort({ createdAt: -1 }).toArray();
    return docs.map((d) => resourceFromDoc(d as Record<string, unknown>));
  }

  async function logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void> {
    await getDb().collection("quiz_responses").insertOne({
      id: randomUUID(),
      answers: JSON.stringify(answers),
      recommendation: JSON.stringify(recommendation),
      sourcePlatform,
      createdAt: new Date().toISOString(),
    });
  }

  function seoTemplateFromDoc(d: Record<string, unknown>): SeoTemplate {
    return {
      id: d.id as string,
      entityType: d.entityType as SeoTemplate["entityType"],
      titleTemplate: (d.titleTemplate as string) ?? "",
      descriptionTemplate: (d.descriptionTemplate as string) ?? "",
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
    };
  }

  async function listSeoTemplates(): Promise<SeoTemplate[]> {
    const docs = await getDb().collection("seo_templates").find({}).sort({ entityType: 1 }).toArray();
    return docs.map((d) => seoTemplateFromDoc(d as Record<string, unknown>));
  }

  async function getSeoTemplate(entityType: SeoEntityType): Promise<SeoTemplate | undefined> {
    const doc = await getDb().collection("seo_templates").findOne({ entityType });
    return doc ? seoTemplateFromDoc(doc as Record<string, unknown>) : undefined;
  }

  async function upsertSeoTemplate(
    entityType: SeoEntityType,
    data: { titleTemplate: string; descriptionTemplate: string }
  ): Promise<SeoTemplate> {
    const collection = getDb().collection("seo_templates");
    const existing = await collection.findOne({ entityType });
    const id = (existing?.id as string) ?? randomUUID();
    const now = new Date().toISOString();
    await collection.updateOne(
      { entityType },
      { $set: { id, entityType, ...data, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    return (await getSeoTemplate(entityType))!;
  }

  return {
    projects,
    experience,
    skills,
    awards,
    education,
    pages,
    guides,
    platforms,
    tags,
    resources,
    getProjectBlocks,
    replaceProjectBlocks,
    getGuideSteps,
    replaceGuideSteps,
    getGuideTags,
    setGuideTags,
    getPlatformsForResource,
    setResourcePlatforms,
    getResourcesForPlatform,
    getResourcesForGuide,
    setGuideResources,
    listGuides,
    getGuideBySlug,
    getPlatformBySlug,
    upsertPlatform,
    upsertTag,
    listResources,
    logQuizResponse,
    listSeoTemplates,
    getSeoTemplate,
    upsertSeoTemplate,
    async migrate() {
      await client.connect();
      await applyMongoMigrations(getDb(), mongoMigrations);
    },
  };
}
