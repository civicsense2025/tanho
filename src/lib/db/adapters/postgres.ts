import postgres, { type Sql } from "postgres";
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
import { applyPostgresMigrations } from "../migrate-runner-postgres";
import { postgresMigrations } from "../migrations/postgres";
import { sqlRepository as sharedSqlRepository, type ColumnMap, type SqlDialect } from "./sql-core";

/** postgres dialect for the shared SQL repository: "$n" placeholders, executed via sql.unsafe. */
function postgresDialect(sql: Sql): SqlDialect {
  return {
    placeholder: (i) => `$${i}`,
    async query(text, args) {
      return sql.unsafe<Record<string, unknown>[]>(text, args as never[]);
    },
  };
}

function makeSqlRepository<T extends { id: string }>(sql: Sql, table: string, columns: ColumnMap<T>): Repository<T> {
  return sharedSqlRepository<T>(postgresDialect(sql), table, columns);
}

export function createPostgresAdapter(): DbAdapter {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL or DATABASE_URL must be set when DB_PROVIDER=postgres");
  // Return timestamptz/timestamp as ISO strings (not Date objects) so every backend agrees on
  // the string-typed createdAt/updatedAt the app and the adapter contract expect. Without this
  // the postgres driver hands back Date instances and callers diverge from libsql/mongo.
  const sql = postgres(url, {
    types: {
      // Emit timestamp/timestamptz as ISO strings. OID 1114 = timestamp, 1184 = timestamptz.
      // Plain `date` (1082) is intentionally left to the driver's default so date-only columns
      // (e.g. Award.date) aren't reshaped into full datetimes.
      timestamp: {
        to: 1184,
        from: [1114, 1184],
        serialize: (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)),
        parse: (v: string) => new Date(v).toISOString(),
      },
    },
  });

  const experience = makeSqlRepository<Experience>(sql, "experience", {
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

  const skills = makeSqlRepository<Skill>(sql, "skills", {
    name: "name",
    category: "category",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const awards = makeSqlRepository<Award>(sql, "awards", {
    title: "title",
    organization: "organization",
    description: "description",
    date: "date",
    url: "url",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const education = makeSqlRepository<Education>(sql, "education", {
    school: "school",
    degree: "degree",
    span: "span",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const platforms = makeSqlRepository<Platform>(sql, "platforms", {
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

  const tags = makeSqlRepository<Tag>(sql, "tags", {
    slug: "slug",
    name: "name",
  });

  const subscribers = makeSqlRepository<Subscriber>(sql, "subscribers", {
    email: "email",
    status: "status",
    confirmToken: "confirm_token",
    unsubscribeToken: "unsubscribe_token",
    source: "source",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const orders = makeSqlRepository<Order>(sql, "orders", {
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

  const subscriptions = makeSqlRepository<Subscription>(sql, "subscriptions", {
    stripeSubscriptionId: "stripe_subscription_id",
    stripeCustomerId: "stripe_customer_id",
    customerEmail: "customer_email",
    status: "status",
    currentPeriodEnd: "current_period_end",
    priceId: "price_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const contentTypes = makeSqlRepository<ContentType>(sql, "content_types", {
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

  const contentEntries = makeSqlRepository<ContentEntry>(sql, "content_entries", {
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

  const collections = makeSqlRepository<Collection>(sql, "collections", {
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
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT id FROM subscribers WHERE confirm_token = $1 OR unsubscribe_token = $1 LIMIT 1",
      [token] as never[]
    );
    if (!rows[0]) return undefined;
    return subscribers.get(String(rows[0].id));
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
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM post_deliveries WHERE post_id = $1",
      [postId] as never[]
    );
    return rows.map(deliveryRow);
  }

  async function recordDelivery(
    postId: string,
    subscriberId: string,
    patch: Partial<Omit<PostDelivery, "id" | "postId" | "subscriberId">>
  ): Promise<void> {
    await sql.unsafe(
      `INSERT INTO post_deliveries (id, post_id, subscriber_id, status, provider_message_id, sent_at, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (post_id, subscriber_id) DO UPDATE SET
         status=excluded.status,
         provider_message_id=excluded.provider_message_id,
         sent_at=excluded.sent_at,
         error=excluded.error`,
      [
        randomUUID(), postId, subscriberId,
        patch.status ?? "queued",
        patch.providerMessageId ?? null,
        patch.sentAt ?? null,
        patch.error ?? null,
      ] as never[]
    );
  }

  function tagRow(row: Record<string, unknown>): Tag {
    return { id: String(row.id), slug: row.slug as string, name: row.name as string };
  }

  async function getContentEntryCollections(entryId: string): Promise<ContentEntryCollection[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM content_entry_collections WHERE content_entry_id = $1 ORDER BY sort_order ASC",
      [entryId] as never[]
    );
    return rows.map((row) => ({
      id: String(row.id),
      contentEntryId: String(row.content_entry_id),
      collectionId: String(row.collection_id),
      sortOrder: Number(row.sort_order),
    }));
  }

  async function setContentEntryCollections(entryId: string, cols: { collectionId: string; sortOrder: number }[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM content_entry_collections WHERE content_entry_id = $1", [entryId] as never[]);
      if (cols.length === 0) return;
      const ids = cols.map(() => randomUUID());
      const values = cols.map((_, i) => `($${i * 3 + 2}, $1, $${i * 3 + 3}, $${i * 3 + 4})`).join(", ");
      const args = ids.flatMap((id, i) => [id, cols[i].collectionId, cols[i].sortOrder]);
      await tx.unsafe(
        `INSERT INTO content_entry_collections (id, content_entry_id, collection_id, sort_order) VALUES ${values}`,
        [entryId, ...args] as never[]
      );
    });
  }

  async function getContentEntryTags(entryId: string): Promise<Tag[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT t.* FROM tags t JOIN content_entry_tags cet ON cet.tag_id = t.id WHERE cet.content_entry_id = $1 ORDER BY t.name ASC",
      [entryId] as never[]
    );
    return rows.map(tagRow);
  }

  async function setContentEntryTags(entryId: string, tagIds: string[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM content_entry_tags WHERE content_entry_id = $1", [entryId] as never[]);
      if (tagIds.length === 0) return;
      const ids = tagIds.map(() => randomUUID());
      const values = tagIds.map((_, i) => `($${i * 2 + 2}, $1, $${i * 2 + 3})`).join(", ");
      const args = ids.flatMap((id, i) => [id, tagIds[i]]);
      await tx.unsafe(
        `INSERT INTO content_entry_tags (id, content_entry_id, tag_id) VALUES ${values}`,
        [entryId, ...args] as never[]
      );
    });
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

  async function getPlatformsForResource(resourceId: string): Promise<Platform[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT p.* FROM platforms p JOIN resource_platforms rp ON rp.platform_id = p.id WHERE rp.resource_id = $1 ORDER BY p.name ASC",
      [resourceId] as never[]
    );
    return rows.map(platformRow);
  }

  async function setResourcePlatforms(resourceId: string, platformIds: string[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM resource_platforms WHERE resource_id = $1", [resourceId] as never[]);
      if (platformIds.length === 0) return;
      const values = platformIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await tx.unsafe(
        `INSERT INTO resource_platforms (resource_id, platform_id) VALUES ${values}`,
        [resourceId, ...platformIds] as never[]
      );
    });
  }

  function contentEntryRow(row: Record<string, unknown>): ContentEntry {
    return {
      id: String(row.id),
      contentTypeId: String(row.content_type_id),
      slug: row.slug as string,
      title: row.title as string,
      status: row.status as ContentEntryStatus,
      scheduledAt: (row.scheduled_at as string) ?? null,
      publishedAt: (row.published_at as string) ?? null,
      sortOrder: Number(row.sort_order),
      seoTitle: (row.seo_title as string) ?? null,
      seoDescription: (row.seo_description as string) ?? null,
      ogImage: (row.og_image as string) ?? null,
      canonicalUrl: (row.canonical_url as string) ?? null,
      noIndex: Number(row.no_index),
      data: row.data as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  async function getResourcesForPlatform(platformSlug: string, publicOnly = true): Promise<ContentEntry[]> {
    const where = publicOnly ? "AND e.status = 'published'" : "";
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT e.* FROM content_entries e
       JOIN resource_platforms rp ON rp.resource_id = e.id
       JOIN platforms p ON p.id = rp.platform_id
       WHERE p.slug = $1 ${where}
       ORDER BY e.created_at DESC`,
      [platformSlug] as never[]
    );
    return rows.map(contentEntryRow);
  }

  async function getPlatformBySlug(slug: string): Promise<Platform | undefined> {
    const [p] = await platforms.list({ where: { slug } });
    return p;
  }

  async function upsertPlatform(data: Omit<Platform, "id">): Promise<Platform> {
    const id = randomUUID();
    await sql.unsafe(
      `INSERT INTO platforms (id, slug, name, kind, category, logo_url, description, sort_order,
          official_url, is_open_source, pricing_model, pricing_notes, github_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (slug) DO UPDATE SET name=excluded.name, kind=excluded.kind, category=excluded.category,
          logo_url=excluded.logo_url, description=excluded.description, sort_order=excluded.sort_order,
          official_url=excluded.official_url, is_open_source=excluded.is_open_source,
          pricing_model=excluded.pricing_model, pricing_notes=excluded.pricing_notes, github_url=excluded.github_url`,
      [
        id, data.slug, data.name, data.kind, data.category, data.logoUrl, data.description, data.sortOrder,
        data.officialUrl, data.isOpenSource, data.pricingModel, data.pricingNotes, data.githubUrl,
      ] as never[]
    );
    const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM platforms WHERE slug = $1", [data.slug] as never[]);
    return platformRow(rows[0]);
  }

  async function upsertTag(data: Omit<Tag, "id">): Promise<Tag> {
    const id = randomUUID();
    await sql.unsafe(
      "INSERT INTO tags (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name=excluded.name",
      [id, data.slug, data.name] as never[]
    );
    const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM tags WHERE slug = $1", [data.slug] as never[]);
    return tagRow(rows[0]);
  }

  async function logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void> {
    await sql.unsafe(
      "INSERT INTO quiz_responses (id, answers, recommendation, source_platform) VALUES ($1, $2, $3, $4)",
      [randomUUID(), JSON.stringify(answers), JSON.stringify(recommendation), sourcePlatform] as never[]
    );
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
    const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM seo_templates ORDER BY entity_type ASC");
    return rows.map(seoTemplateRow);
  }

  async function getSeoTemplate(entityType: SeoEntityType): Promise<SeoTemplate | undefined> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM seo_templates WHERE entity_type = $1",
      [entityType] as never[]
    );
    return rows[0] ? seoTemplateRow(rows[0]) : undefined;
  }

  async function upsertSeoTemplate(
    entityType: SeoEntityType,
    data: { titleTemplate: string; descriptionTemplate: string }
  ): Promise<SeoTemplate> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await sql.unsafe(
      `INSERT INTO seo_templates (id, entity_type, title_template, description_template, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (entity_type) DO UPDATE SET title_template=excluded.title_template,
         description_template=excluded.description_template, updated_at=excluded.updated_at`,
      [id, entityType, data.titleTemplate, data.descriptionTemplate, now, now] as never[]
    );
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
    const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM site_settings ORDER BY key ASC");
    return rows.map(siteSettingRow);
  }

  async function getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM site_settings WHERE key = $1", [key] as never[]);
    return rows[0] ? siteSettingRow(rows[0]) : undefined;
  }

  async function upsertSiteSetting(key: string, data: { value: string | null; isSecret: number }): Promise<SiteSetting> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await sql.unsafe(
      `INSERT INTO site_settings (id, key, value, is_secret, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE SET value=excluded.value, is_secret=excluded.is_secret, updated_at=excluded.updated_at`,
      [id, key, data.value, data.isSecret, now] as never[]
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
    migrate: () => applyPostgresMigrations(sql, postgresMigrations),
  };
}
