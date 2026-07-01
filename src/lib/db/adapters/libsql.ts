import { createClient, type Client, type InValue } from "@libsql/client";
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
  Order,
  Page,
  Platform,
  Post,
  PostDelivery,
  Project,
  ProjectBlock,
  Repository,
  Resource,
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

  const projects = makeSqlRepository<Project>(client, "projects", {
    slug: "slug",
    title: "title",
    tagline: "tagline",
    description: "description",
    coverImage: "cover_image",
    logoUrl: "logo_url",
    tags: "tags",
    githubUrl: "github_url",
    liveUrl: "live_url",
    year: "year",
    status: "status",
    sortOrder: "sort_order",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    ogImage: "og_image",
    canonicalUrl: "canonical_url",
    noIndex: "no_index",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

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

  const pages = makeSqlRepository<Page>(client, "pages", {
    slug: "slug",
    title: "title",
    route: "route",
    status: "status",
    sortOrder: "sort_order",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    ogImage: "og_image",
    canonicalUrl: "canonical_url",
    noIndex: "no_index",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const guides = makeSqlRepository<Guide>(client, "guides", {
    slug: "slug",
    title: "title",
    tagline: "tagline",
    summary: "summary",
    sourcePlatform: "source_platform",
    targetPlatform: "target_platform",
    difficulty: "difficulty",
    effortHoursMin: "effort_hours_min",
    effortHoursMax: "effort_hours_max",
    costMinUsd: "cost_min_usd",
    costMaxUsd: "cost_max_usd",
    costPeriod: "cost_period",
    skillsRequired: "skills_required",
    requirements: "requirements",
    coverImage: "cover_image",
    status: "status",
    sortOrder: "sort_order",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    ogImage: "og_image",
    canonicalUrl: "canonical_url",
    noIndex: "no_index",
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

  const resources = makeSqlRepository<Resource>(client, "resources", {
    title: "title",
    url: "url",
    sourceName: "source_name",
    summary: "summary",
    resourceType: "resource_type",
    internalNotes: "internal_notes",
    isPublic: "is_public",
    status: "status",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    ogImage: "og_image",
    canonicalUrl: "canonical_url",
    noIndex: "no_index",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const posts = makeSqlRepository<Post>(client, "posts", {
    slug: "slug",
    title: "title",
    subtitle: "subtitle",
    excerpt: "excerpt",
    coverImage: "cover_image",
    status: "status",
    visibility: "visibility",
    publishedAt: "published_at",
    sortOrder: "sort_order",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    ogImage: "og_image",
    canonicalUrl: "canonical_url",
    noIndex: "no_index",
    createdAt: "created_at",
    updatedAt: "updated_at",
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

  async function getProjectBlocks(projectId: string): Promise<ProjectBlock[]> {
    const result = await client.execute({
      sql: "SELECT * FROM project_blocks WHERE project_id = ? ORDER BY sort_order ASC",
      args: [projectId],
    });
    return result.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        projectId: String(row.project_id),
        type: row.type as ProjectBlock["type"],
        content: row.content as string,
        sortOrder: Number(row.sort_order),
      };
    });
  }

  async function replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM project_blocks WHERE project_id = ?", args: [projectId] },
        ...blocks.map((b, i) => ({
          sql: "INSERT INTO project_blocks (id, project_id, type, content, sort_order) VALUES (?, ?, ?, ?, ?)",
          args: [randomUUID(), projectId, b.type, b.content, i],
        })),
      ],
      "write"
    );
  }

  async function getGuideSteps(guideId: string): Promise<GuideStep[]> {
    const result = await client.execute({
      sql: "SELECT * FROM guide_steps WHERE guide_id = ? ORDER BY sort_order ASC",
      args: [guideId],
    });
    return result.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        guideId: String(row.guide_id),
        title: (row.title as string) ?? null,
        type: row.type as GuideStep["type"],
        content: row.content as string,
        sortOrder: Number(row.sort_order),
      };
    });
  }

  async function replaceGuideSteps(guideId: string, steps: Omit<GuideStep, "id" | "guideId">[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM guide_steps WHERE guide_id = ?", args: [guideId] },
        ...steps.map((s, i) => ({
          sql: "INSERT INTO guide_steps (id, guide_id, title, type, content, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
          args: [randomUUID(), guideId, s.title, s.type, s.content, i],
        })),
      ],
      "write"
    );
  }

  function tagRow(row: Record<string, unknown>): Tag {
    return { id: String(row.id), slug: row.slug as string, name: row.name as string };
  }

  async function getGuideTags(guideId: string): Promise<Tag[]> {
    const result = await client.execute({
      sql: "SELECT t.* FROM tags t JOIN guide_tags gt ON gt.tag_id = t.id WHERE gt.guide_id = ? ORDER BY t.name ASC",
      args: [guideId],
    });
    return result.rows.map((r) => tagRow(r as Record<string, unknown>));
  }

  async function setGuideTags(guideId: string, tagIds: string[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM guide_tags WHERE guide_id = ?", args: [guideId] },
        ...tagIds.map((tagId) => ({ sql: "INSERT INTO guide_tags (guide_id, tag_id) VALUES (?, ?)", args: [guideId, tagId] })),
      ],
      "write"
    );
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
    const result = await client.execute({
      sql: "SELECT p.* FROM platforms p JOIN resource_platforms rp ON rp.platform_id = p.id WHERE rp.resource_id = ? ORDER BY p.name ASC",
      args: [resourceId],
    });
    return result.rows.map((r) => platformRow(r as Record<string, unknown>));
  }

  async function setResourcePlatforms(resourceId: string, platformIds: string[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM resource_platforms WHERE resource_id = ?", args: [resourceId] },
        ...platformIds.map((platformId) => ({
          sql: "INSERT INTO resource_platforms (resource_id, platform_id) VALUES (?, ?)",
          args: [resourceId, platformId],
        })),
      ],
      "write"
    );
  }

  function resourceRow(row: Record<string, unknown>): Resource {
    return {
      id: String(row.id),
      title: row.title as string,
      url: row.url as string,
      sourceName: (row.source_name as string) ?? null,
      summary: (row.summary as string) ?? null,
      resourceType: row.resource_type as Resource["resourceType"],
      internalNotes: (row.internal_notes as string) ?? null,
      isPublic: Number(row.is_public),
      status: row.status as Resource["status"],
      seoTitle: (row.seo_title as string) ?? null,
      seoDescription: (row.seo_description as string) ?? null,
      ogImage: (row.og_image as string) ?? null,
      canonicalUrl: (row.canonical_url as string) ?? null,
      noIndex: Number(row.no_index),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  async function getResourcesForPlatform(platformSlug: string, publicOnly = true): Promise<Resource[]> {
    const where = publicOnly ? "AND r.is_public = 1 AND r.status = 'published'" : "";
    const result = await client.execute({
      sql: `SELECT r.* FROM resources r
            JOIN resource_platforms rp ON rp.resource_id = r.id
            JOIN platforms p ON p.id = rp.platform_id
            WHERE p.slug = ? ${where}
            ORDER BY r.created_at DESC`,
      args: [platformSlug],
    });
    return result.rows.map((r) => resourceRow(r as Record<string, unknown>));
  }

  async function getResourcesForGuide(guideId: string, publicOnly = true): Promise<Resource[]> {
    const where = publicOnly ? "AND r.is_public = 1 AND r.status = 'published'" : "";
    const result = await client.execute({
      sql: `SELECT r.* FROM resources r
            JOIN guide_resources gr ON gr.resource_id = r.id
            WHERE gr.guide_id = ? ${where}
            ORDER BY gr.sort_order ASC`,
      args: [guideId],
    });
    return result.rows.map((r) => resourceRow(r as Record<string, unknown>));
  }

  async function setGuideResources(guideId: string, resourceIds: string[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM guide_resources WHERE guide_id = ?", args: [guideId] },
        ...resourceIds.map((resourceId, i) => ({
          sql: "INSERT INTO guide_resources (guide_id, resource_id, sort_order) VALUES (?, ?, ?)",
          args: [guideId, resourceId, i],
        })),
      ],
      "write"
    );
  }

  function guideRow(row: Record<string, unknown>): Guide {
    return {
      id: String(row.id),
      slug: row.slug as string,
      title: row.title as string,
      tagline: (row.tagline as string) ?? null,
      summary: (row.summary as string) ?? null,
      sourcePlatform: row.source_platform as string,
      targetPlatform: row.target_platform as string,
      difficulty: row.difficulty as Guide["difficulty"],
      effortHoursMin: row.effort_hours_min == null ? null : Number(row.effort_hours_min),
      effortHoursMax: row.effort_hours_max == null ? null : Number(row.effort_hours_max),
      costMinUsd: row.cost_min_usd == null ? null : Number(row.cost_min_usd),
      costMaxUsd: row.cost_max_usd == null ? null : Number(row.cost_max_usd),
      costPeriod: row.cost_period as Guide["costPeriod"],
      skillsRequired: row.skills_required as string,
      requirements: row.requirements as string,
      coverImage: (row.cover_image as string) ?? null,
      status: row.status as Guide["status"],
      sortOrder: Number(row.sort_order),
      seoTitle: (row.seo_title as string) ?? null,
      seoDescription: (row.seo_description as string) ?? null,
      ogImage: (row.og_image as string) ?? null,
      canonicalUrl: (row.canonical_url as string) ?? null,
      noIndex: Number(row.no_index),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  const DIFFICULTY_RANK: Record<Guide["difficulty"], number> = { beginner: 0, intermediate: 1, advanced: 2 };

  async function listGuides(filter: GuideFilter = {}): Promise<Guide[]> {
    const where: string[] = [];
    const args: InValue[] = [];
    if (filter.publishedOnly !== false) where.push("status = 'published'");
    if (filter.sourcePlatform) { where.push("source_platform = ?"); args.push(filter.sourcePlatform); }
    if (filter.targetPlatform) { where.push("target_platform = ?"); args.push(filter.targetPlatform); }
    const sql = `SELECT * FROM guides ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY sort_order ASC, id DESC`;
    const result = await client.execute({ sql, args });
    let list = result.rows.map((r) => guideRow(r as Record<string, unknown>));
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

  async function listResources(publicOnly = true): Promise<Resource[]> {
    const where = publicOnly ? "WHERE is_public = 1 AND status = 'published'" : "";
    const result = await client.execute(`SELECT * FROM resources ${where} ORDER BY created_at DESC`);
    return result.rows.map((r) => resourceRow(r as Record<string, unknown>));
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
    posts,
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
    listSiteSettings,
    getSiteSetting,
    upsertSiteSetting,
    migrate: () => applyMigrations(client, libsqlMigrations),
  };
}
