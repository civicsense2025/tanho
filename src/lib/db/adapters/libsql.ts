import { createClient, type Client, type InValue } from "@libsql/client";
import { randomUUID } from "crypto";
import type {
  Award,
  Collection,
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
import { applyMigrations } from "../migrate-runner";
import { libsqlMigrations } from "../migrations/libsql";
import { sqlRepository as sharedSqlRepository, type ColumnMap, type SqlDialect } from "./sql-core";

/** libsql dialect for the shared SQL repository: positional "?" placeholders, executed via
 * client.execute. */
function libsqlDialect(client: Client): SqlDialect {
  return {
    placeholder: () => "?",
    async query(text, args) {
      const result = await client.execute({ sql: text, args: args as InValue[] });
      return result.rows as unknown as Record<string, unknown>[];
    },
  };
}

/** Builds a generic repository bound to this client's dialect. */
function makeSqlRepository<T extends { id: string }>(client: Client, table: string, columns: ColumnMap<T>): Repository<T> {
  return sharedSqlRepository<T>(libsqlDialect(client), table, columns);
}

export function createLibsqlAdapter(): DbAdapter {
  const url = process.env.TURSO_DATABASE_URL || "file:./db/portfolio.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  const experience = makeSqlRepository<Experience>(client, "experience", {
    company: "company",
    role: "role",
    description: "description",
    startDate: "start_date",
    endDate: "end_date",
    current: "current",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const skills = makeSqlRepository<Skill>(client, "skills", {
    name: "name",
    category: "category",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const awards = makeSqlRepository<Award>(client, "awards", {
    title: "title",
    organization: "organization",
    description: "description",
    date: "date",
    url: "url",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const education = makeSqlRepository<Education>(client, "education", {
    school: "school",
    degree: "degree",
    span: "span",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const platforms = makeSqlRepository<Platform>(client, "platforms", {
    slug: "slug",
    name: "name",
    kind: "kind",
    category: "category",
    logoUrl: "logo_url",
    description: "description",
    sortOrder: "sort_order",
    officialUrl: "official_url",
    isOpenSource: "is_open_source",
    pricingModel: "pricing_model",
    pricingNotes: "pricing_notes",
    githubUrl: "github_url",
  });

  const tags = makeSqlRepository<Tag>(client, "tags", {
    slug: "slug",
    name: "name",
  });

  const subscribers = makeSqlRepository<Subscriber>(client, "subscribers", {
    email: "email",
    status: "status",
    confirmToken: "confirm_token",
    unsubscribeToken: "unsubscribe_token",
    source: "source",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const orders = makeSqlRepository<Order>(client, "orders", {
    stripeCheckoutSessionId: "stripe_checkout_session_id",
    stripeCustomerId: "stripe_customer_id",
    stripePaymentIntentId: "stripe_payment_intent_id",
    customerEmail: "customer_email",
    kind: "kind",
    status: "status",
    postId: "post_id",
    priceId: "price_id",
    amountTotal: "amount_total",
    currency: "currency",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const subscriptions = makeSqlRepository<Subscription>(client, "subscriptions", {
    stripeSubscriptionId: "stripe_subscription_id",
    stripeCustomerId: "stripe_customer_id",
    customerEmail: "customer_email",
    status: "status",
    currentPeriodEnd: "current_period_end",
    priceId: "price_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const contentTypes = makeSqlRepository<ContentType>(client, "content_types", {
    slug: "slug",
    name: "name",
    icon: "icon",
    fields: "fields",
    isBuiltIn: "is_built_in",
    sortOrder: "sort_order",
    seoTitleTemplate: "seo_title_template",
    seoDescriptionTemplate: "seo_description_template",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const contentEntries = makeSqlRepository<ContentEntry>(client, "content_entries", {
    contentTypeId: "content_type_id",
    slug: "slug",
    title: "title",
    status: "status",
    scheduledAt: "scheduled_at",
    publishedAt: "published_at",
    sortOrder: "sort_order",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    ogImage: "og_image",
    canonicalUrl: "canonical_url",
    noIndex: "no_index",
    data: "data",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const collections = makeSqlRepository<Collection>(client, "collections", {
    slug: "slug",
    name: "name",
    description: "description",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

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
    // Match either token — confirm (double-opt-in) or unsubscribe.
    const result = await client.execute({
      sql: "SELECT * FROM subscribers WHERE confirm_token = ? OR unsubscribe_token = ? LIMIT 1",
      args: [token, token],
    });
    if (!result.rows[0]) return undefined;
    const [s] = await subscribers.list({ where: { id: String(result.rows[0].id) } as never });
    return s;
  }

  async function listActiveSubscribers(): Promise<Subscriber[]> {
    return subscribers.list({ where: { status: "active" } });
  }

  function deliveryRow(row: Record<string, unknown>): PostDelivery {
    return {
      id: String(row.id),
      postId: String(row.post_id),
      subscriberId: String(row.subscriber_id),
      status: row.status as PostDelivery["status"],
      providerMessageId: (row.provider_message_id as string) ?? null,
      sentAt: (row.sent_at as string) ?? null,
      error: (row.error as string) ?? null,
    };
  }

  async function getDeliveriesForPost(postId: string): Promise<PostDelivery[]> {
    const result = await client.execute({
      sql: "SELECT * FROM post_deliveries WHERE post_id = ?",
      args: [postId],
    });
    return result.rows.map((r) => deliveryRow(r as Record<string, unknown>));
  }

  async function recordDelivery(
    postId: string,
    subscriberId: string,
    patch: Partial<Omit<PostDelivery, "id" | "postId" | "subscriberId">>
  ): Promise<void> {
    // Upsert one delivery row for (post, subscriber); the unique constraint makes retries safe.
    await client.execute({
      sql: `INSERT INTO post_deliveries (id, post_id, subscriber_id, status, provider_message_id, sent_at, error)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(post_id, subscriber_id) DO UPDATE SET
              status=excluded.status,
              provider_message_id=excluded.provider_message_id,
              sent_at=excluded.sent_at,
              error=excluded.error`,
      args: [
        randomUUID(), postId, subscriberId,
        patch.status ?? "queued",
        patch.providerMessageId ?? null,
        patch.sentAt ?? null,
        patch.error ?? null,
      ],
    });
  }

  function tagRow(row: Record<string, unknown>): Tag {
    return { id: String(row.id), slug: row.slug as string, name: row.name as string };
  }

  async function getContentEntryCollections(entryId: string): Promise<ContentEntryCollection[]> {
    const result = await client.execute({
      sql: "SELECT * FROM content_entry_collections WHERE content_entry_id = ? ORDER BY sort_order ASC",
      args: [entryId],
    });
    return result.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        contentEntryId: String(row.content_entry_id),
        collectionId: String(row.collection_id),
        sortOrder: Number(row.sort_order),
      };
    });
  }

  async function setContentEntryCollections(entryId: string, cols: { collectionId: string; sortOrder: number }[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM content_entry_collections WHERE content_entry_id = ?", args: [entryId] },
        ...cols.map((c) => ({
          sql: "INSERT INTO content_entry_collections (id, content_entry_id, collection_id, sort_order) VALUES (?, ?, ?, ?)",
          args: [randomUUID(), entryId, c.collectionId, c.sortOrder],
        })),
      ],
      "write"
    );
  }

  async function getContentEntryTags(entryId: string): Promise<Tag[]> {
    const result = await client.execute({
      sql: "SELECT t.* FROM tags t JOIN content_entry_tags cet ON cet.tag_id = t.id WHERE cet.content_entry_id = ? ORDER BY t.name ASC",
      args: [entryId],
    });
    return result.rows.map((r) => tagRow(r as Record<string, unknown>));
  }

  async function setContentEntryTags(entryId: string, tagIds: string[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM content_entry_tags WHERE content_entry_id = ?", args: [entryId] },
        ...tagIds.map((tagId) => ({
          sql: "INSERT INTO content_entry_tags (id, content_entry_id, tag_id) VALUES (?, ?, ?)",
          args: [randomUUID(), entryId, tagId],
        })),
      ],
      "write"
    );
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

  function platformRow(row: Record<string, unknown>): Platform {
    return {
      id: String(row.id),
      slug: row.slug as string,
      name: row.name as string,
      kind: row.kind as Platform["kind"],
      category: (row.category as string) ?? null,
      logoUrl: (row.logo_url as string) ?? null,
      description: (row.description as string) ?? null,
      sortOrder: Number(row.sort_order),
      officialUrl: (row.official_url as string) ?? null,
      isOpenSource: Number(row.is_open_source),
      pricingModel: (row.pricing_model as Platform["pricingModel"]) ?? null,
      pricingNotes: (row.pricing_notes as string) ?? null,
      githubUrl: (row.github_url as string) ?? null,
    };
  }

  async function getPlatformBySlug(slug: string): Promise<Platform | undefined> {
    const [p] = await platforms.list({ where: { slug } });
    return p;
  }

  async function upsertPlatform(data: Omit<Platform, "id">): Promise<Platform> {
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO platforms (id, slug, name, kind, category, logo_url, description, sort_order,
              official_url, is_open_source, pricing_model, pricing_notes, github_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET name=excluded.name, kind=excluded.kind, category=excluded.category,
              logo_url=excluded.logo_url, description=excluded.description, sort_order=excluded.sort_order,
              official_url=excluded.official_url, is_open_source=excluded.is_open_source,
              pricing_model=excluded.pricing_model, pricing_notes=excluded.pricing_notes, github_url=excluded.github_url`,
      args: [
        id, data.slug, data.name, data.kind, data.category, data.logoUrl, data.description, data.sortOrder,
        data.officialUrl, data.isOpenSource, data.pricingModel, data.pricingNotes, data.githubUrl,
      ],
    });
    const result = await client.execute({ sql: "SELECT * FROM platforms WHERE slug = ?", args: [data.slug] });
    return platformRow(result.rows[0] as Record<string, unknown>);
  }

  async function upsertTag(data: Omit<Tag, "id">): Promise<Tag> {
    const id = randomUUID();
    await client.execute({
      sql: "INSERT INTO tags (id, slug, name) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name=excluded.name",
      args: [id, data.slug, data.name],
    });
    const result = await client.execute({ sql: "SELECT * FROM tags WHERE slug = ?", args: [data.slug] });
    return tagRow(result.rows[0] as Record<string, unknown>);
  }

  async function logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void> {
    await client.execute({
      sql: "INSERT INTO quiz_responses (id, answers, recommendation, source_platform) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), JSON.stringify(answers), JSON.stringify(recommendation), sourcePlatform],
    });
  }

  function seoTemplateRow(row: Record<string, unknown>): SeoTemplate {
    return {
      id: String(row.id),
      entityType: row.entity_type as SeoTemplate["entityType"],
      titleTemplate: (row.title_template as string) ?? "",
      descriptionTemplate: (row.description_template as string) ?? "",
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  async function listSeoTemplates(): Promise<SeoTemplate[]> {
    const result = await client.execute("SELECT * FROM seo_templates ORDER BY entity_type ASC");
    return result.rows.map((r) => seoTemplateRow(r as Record<string, unknown>));
  }

  async function getSeoTemplate(entityType: SeoEntityType): Promise<SeoTemplate | undefined> {
    const result = await client.execute({ sql: "SELECT * FROM seo_templates WHERE entity_type = ?", args: [entityType] });
    return result.rows[0] ? seoTemplateRow(result.rows[0] as Record<string, unknown>) : undefined;
  }

  async function upsertSeoTemplate(
    entityType: SeoEntityType,
    data: { titleTemplate: string; descriptionTemplate: string }
  ): Promise<SeoTemplate> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO seo_templates (id, entity_type, title_template, description_template, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(entity_type) DO UPDATE SET title_template=excluded.title_template,
              description_template=excluded.description_template, updated_at=excluded.updated_at`,
      args: [id, entityType, data.titleTemplate, data.descriptionTemplate, now, now],
    });
    return (await getSeoTemplate(entityType))!;
  }

  function siteSettingRow(row: Record<string, unknown>): SiteSetting {
    return {
      id: String(row.id),
      key: row.key as string,
      value: (row.value as string | null) ?? null,
      isSecret: Number(row.is_secret),
      updatedAt: row.updated_at as string,
    };
  }

  async function listSiteSettings(): Promise<SiteSetting[]> {
    const result = await client.execute("SELECT * FROM site_settings ORDER BY key ASC");
    return result.rows.map((r) => siteSettingRow(r as Record<string, unknown>));
  }

  async function getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const result = await client.execute({ sql: "SELECT * FROM site_settings WHERE key = ?", args: [key] });
    return result.rows[0] ? siteSettingRow(result.rows[0] as Record<string, unknown>) : undefined;
  }

  async function upsertSiteSetting(key: string, data: { value: string | null; isSecret: number }): Promise<SiteSetting> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO site_settings (id, key, value, is_secret, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, is_secret=excluded.is_secret, updated_at=excluded.updated_at`,
      args: [id, key, data.value, data.isSecret, now],
    });
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
    migrate: () => applyMigrations(client, libsqlMigrations),
  };
}
