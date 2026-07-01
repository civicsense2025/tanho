import { MongoClient, type Collection, type Db, type Filter } from "mongodb";
import { randomUUID } from "crypto";
import type {
  Award,
  Collection as CollectionEntity,
  ContentEntry,
  ContentEntryCollection,
  ContentEntryStatus,
  ContentEntryTag,
  ContentType,
  DbAdapter,
  Education,
  Experience,
  ListQuery,
  Order,
  Platform,
  PostDelivery,
  Repository,
  SeoEntityType,
  SeoTemplate,
  SiteSetting,
  Skill,
  Subscriber,
  Subscription,
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
      // Whitelist against the existing document's own fields so an admin PATCH body
      // can't mass-assign arbitrary new top-level fields into the collection (id/_id
      // are never assignable this way, matching the ColumnMap-based SQL adapters).
      const existing = await collection.findOne({ id });
      if (!existing) return (await this.get(id))!;
      const allowed = new Set(Object.keys(existing).filter((k) => k !== "_id" && k !== "id"));
      const update: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (allowed.has(key)) update[key] = value;
      }
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

  const experience = mongoRepository<Experience>(getDb().collection("experience"));
  const skills = mongoRepository<Skill>(getDb().collection("skills"));
  const awards = mongoRepository<Award>(getDb().collection("awards"));
  const education = mongoRepository<Education>(getDb().collection("education"));
  const platforms = mongoRepository<Platform>(getDb().collection("platforms"));
  const tags = mongoRepository<Tag>(getDb().collection("tags"));
  const subscribers = mongoRepository<Subscriber>(getDb().collection("subscribers"));
  const orders = mongoRepository<Order>(getDb().collection("orders"));
  const subscriptions = mongoRepository<Subscription>(getDb().collection("subscriptions"));
  const contentTypes = mongoRepository<ContentType>(getDb().collection("content_types"));
  const contentEntries = mongoRepository<ContentEntry>(getDb().collection("content_entries"));
  const collections = mongoRepository<CollectionEntity>(getDb().collection("collections"));

  async function getOrderByCheckoutSession(sessionId: string): Promise<Order | undefined> {
    const [o] = await orders.list({ where: { stripeCheckoutSessionId: sessionId } });
    return o;
  }

  async function getOrdersByEmail(email: string): Promise<Order[]> {
    return orders.list({ where: { customerEmail: email }, orderBy: [{ field: "createdAt", direction: "desc" }] });
  }

  async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [s] = await subscriptions.list({ where: { stripeSubscriptionId } });
    return s;
  }

  async function getActiveSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
    const rows = await subscriptions.list({ where: { customerEmail: email, status: "active" } });
    return rows[0];
  }

  async function getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [s] = await subscribers.list({ where: { email } });
    return s;
  }

  async function getSubscriberByToken(token: string): Promise<Subscriber | undefined> {
    // $or over the two token fields; token is Zod-narrowed upstream so it can't be an operator.
    const doc = await getDb()
      .collection("subscribers")
      .findOne({ $or: [{ confirmToken: token }, { unsubscribeToken: token }] });
    if (!doc) return undefined;
    return subscribers.get(doc.id as string);
  }

  async function listActiveSubscribers(): Promise<Subscriber[]> {
    return subscribers.list({ where: { status: "active" } });
  }

  async function getDeliveriesForPost(postId: string): Promise<PostDelivery[]> {
    const docs = await getDb().collection("post_deliveries").find({ postId }).toArray();
    return docs.map((d) => ({
      id: d.id as string,
      postId: d.postId as string,
      subscriberId: d.subscriberId as string,
      status: d.status as PostDelivery["status"],
      providerMessageId: (d.providerMessageId as string) ?? null,
      sentAt: (d.sentAt as string) ?? null,
      error: (d.error as string) ?? null,
    }));
  }

  async function recordDelivery(
    postId: string,
    subscriberId: string,
    patch: Partial<Omit<PostDelivery, "id" | "postId" | "subscriberId">>
  ): Promise<void> {
    await getDb()
      .collection("post_deliveries")
      .updateOne(
        { postId, subscriberId },
        {
          $set: {
            status: patch.status ?? "queued",
            providerMessageId: patch.providerMessageId ?? null,
            sentAt: patch.sentAt ?? null,
            error: patch.error ?? null,
          },
          $setOnInsert: { id: randomUUID(), postId, subscriberId },
        },
        { upsert: true }
      );
  }

  async function getContentEntryCollections(entryId: string): Promise<ContentEntryCollection[]> {
    const docs = await getDb().collection("content_entry_collections").find({ contentEntryId: entryId }).sort({ sortOrder: 1 }).toArray();
    return docs.map((d) => ({
      id: d.id as string,
      contentEntryId: d.contentEntryId as string,
      collectionId: d.collectionId as string,
      sortOrder: d.sortOrder as number,
    }));
  }

  async function setContentEntryCollections(entryId: string, cols: { collectionId: string; sortOrder: number }[]): Promise<void> {
    const collection = getDb().collection("content_entry_collections");
    await collection.deleteMany({ contentEntryId: entryId });
    if (cols.length === 0) return;
    await collection.insertMany(cols.map((c) => ({ id: randomUUID(), contentEntryId: entryId, collectionId: c.collectionId, sortOrder: c.sortOrder })));
  }

  async function getContentEntryTags(entryId: string): Promise<Tag[]> {
    const joins = await getDb().collection("content_entry_tags").find({ contentEntryId: entryId }).toArray();
    const tagIds = joins.map((j) => j.tagId as string);
    if (tagIds.length === 0) return [];
    const docs = await getDb().collection("tags").find({ id: { $in: tagIds } }).sort({ name: 1 }).toArray();
    return docs.map((d) => ({ id: d.id as string, slug: d.slug as string, name: d.name as string }));
  }

  async function setContentEntryTags(entryId: string, tagIds: string[]): Promise<void> {
    const collection = getDb().collection("content_entry_tags");
    await collection.deleteMany({ contentEntryId: entryId });
    if (tagIds.length === 0) return;
    await collection.insertMany(tagIds.map((tagId) => ({ id: randomUUID(), contentEntryId: entryId, tagId })));
  }

  async function listContentEntries(filter: { contentTypeId?: string; status?: ContentEntryStatus; publishedOnly?: boolean } = {}): Promise<ContentEntry[]> {
    const where: { contentTypeId?: string; status?: ContentEntryStatus } = {};
    if (filter.contentTypeId) where.contentTypeId = filter.contentTypeId;
    if (filter.publishedOnly) where.status = "published";
    else if (filter.status) where.status = filter.status;
    return contentEntries.list({
      where,
      orderBy: [{ field: "sortOrder", direction: "asc" }, { field: "title", direction: "asc" }],
    });
  }

  async function getContentTypeBySlug(slug: string): Promise<ContentType | undefined> {
    const [t] = await contentTypes.list({ where: { slug } });
    return t;
  }

  async function getContentEntry(typeSlug: string, slug: string): Promise<ContentEntry | undefined> {
    const type = await getContentTypeBySlug(typeSlug);
    if (!type) return undefined;
    const [entry] = await contentEntries.list({ where: { contentTypeId: type.id, slug } });
    return entry;
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

  async function getResourcesForPlatform(platformSlug: string, publicOnly = true): Promise<ContentEntry[]> {
    const platformDoc = await getDb().collection("platforms").findOne({ slug: platformSlug });
    if (!platformDoc) return [];
    const joins = await getDb().collection("resource_platforms").find({ platformId: platformDoc.id }).toArray();
    const resourceIds = joins.map((j) => j.resourceId as string);
    if (resourceIds.length === 0) return [];
    const where: { id: { in: string[] }; status?: ContentEntryStatus } = { id: { in: resourceIds } };
    if (publicOnly) where.status = "published";
    return contentEntries.list({
      where,
      orderBy: [{ field: "createdAt", direction: "desc" }],
    });
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

  function siteSettingFromDoc(d: Record<string, unknown>): SiteSetting {
    return {
      id: d.id as string,
      key: d.key as string,
      value: (d.value as string | null) ?? null,
      isSecret: Number(d.isSecret),
      updatedAt: d.updatedAt as string,
    };
  }

  async function listSiteSettings(): Promise<SiteSetting[]> {
    const docs = await getDb().collection("site_settings").find({}).sort({ key: 1 }).toArray();
    return docs.map((d) => siteSettingFromDoc(d as Record<string, unknown>));
  }

  async function getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const doc = await getDb().collection("site_settings").findOne({ key });
    return doc ? siteSettingFromDoc(doc as Record<string, unknown>) : undefined;
  }

  async function upsertSiteSetting(key: string, data: { value: string | null; isSecret: number }): Promise<SiteSetting> {
    const collection = getDb().collection("site_settings");
    const existing = await collection.findOne({ key });
    const id = (existing?.id as string) ?? randomUUID();
    const now = new Date().toISOString();
    await collection.updateOne(
      { key },
      { $set: { id, key, ...data, updatedAt: now } },
      { upsert: true }
    );
    return (await getSiteSetting(key))!;
  }

  return {
    experience,
    skills,
    awards,
    education,
    platforms,
    tags,
    subscribers,
    orders,
    subscriptions,
    getSubscriberByEmail,
    getSubscriberByToken,
    listActiveSubscribers,
    getDeliveriesForPost,
    recordDelivery,
    getOrderByCheckoutSession,
    getOrdersByEmail,
    getSubscriptionByStripeId,
    getActiveSubscriptionByEmail,
    getPlatformsForResource,
    setResourcePlatforms,
    getResourcesForPlatform,
    getPlatformBySlug,
    upsertPlatform,
    upsertTag,
    logQuizResponse,
    listSeoTemplates,
    getSeoTemplate,
    upsertSeoTemplate,
    listSiteSettings,
    getSiteSetting,
    upsertSiteSetting,
    contentTypes,
    contentEntries,
    collections,
    getContentEntryCollections,
    setContentEntryCollections,
    getContentEntryTags,
    setContentEntryTags,
    listContentEntries,
    getContentEntry,
    getContentTypeBySlug,
    async migrate() {
      await client.connect();
      await applyMongoMigrations(getDb(), mongoMigrations);
    },
  };
}
