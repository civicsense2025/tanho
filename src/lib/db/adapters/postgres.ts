import postgres, { type Sql } from "postgres";
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
import { applyPostgresMigrations } from "../migrate-runner-postgres";
import { postgresMigrations } from "../migrations/postgres";

/** Maps camelCase TS field names to this table's snake_case SQL columns. */
type ColumnMap<T> = { [K in keyof Omit<T, "id">]: string };

function sqlRepository<T extends { id: string }>(
  sql: Sql,
  table: string,
  columns: ColumnMap<T>
): Repository<T> {
  const fields = Object.keys(columns) as (keyof Omit<T, "id">)[];
  const colFor = (f: keyof Omit<T, "id">) => columns[f];

  function fromRow(row: Record<string, unknown>): T {
    const out: Record<string, unknown> = { id: row.id };
    for (const f of fields) out[f as string] = row[colFor(f)];
    return out as T;
  }

  return {
    async list(query?: ListQuery<T>) {
      const clauses: string[] = [];
      const args: unknown[] = [];
      let paramIndex = 1;
      if (query?.where) {
        for (const [key, value] of Object.entries(query.where)) {
          const col = key === "id" ? "id" : colFor(key as keyof Omit<T, "id">);
          if (value && typeof value === "object" && "in" in (value as object)) {
            const list = (value as { in: unknown[] }).in;
            const placeholders = list.map(() => `$${paramIndex++}`).join(",");
            clauses.push(`${col} IN (${placeholders})`);
            args.push(...list);
          } else {
            clauses.push(`${col} = $${paramIndex++}`);
            args.push(value);
          }
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const order = query?.orderBy?.length
        ? `ORDER BY ${query.orderBy
            .map((o) => `${o.field === "id" ? "id" : colFor(o.field as keyof Omit<T, "id">)} ${o.direction.toUpperCase()}`)
            .join(", ")}`
        : "";
      const limit = query?.limit ? `LIMIT ${query.limit}` : "";
      const offset = query?.offset ? `OFFSET ${query.offset}` : "";
      const rows = await sql.unsafe<Record<string, unknown>[]>(
        `SELECT * FROM ${table} ${where} ${order} ${limit} ${offset}`,
        args as never[]
      );
      return rows.map(fromRow);
    },

    async get(id: string) {
      const rows = await sql.unsafe<Record<string, unknown>[]>(`SELECT * FROM ${table} WHERE id = $1`, [id] as never[]);
      return rows[0] ? fromRow(rows[0]) : undefined;
    },

    async create(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const insertCols = fields.map(colFor);
      const insertVals = fields.map((f) => {
        if (f === "createdAt" || f === "updatedAt") return now;
        return (data as Record<string, unknown>)[f as string] ?? null;
      });
      const placeholders = [id, ...insertVals].map((_, i) => `$${i + 1}`).join(", ");
      await sql.unsafe(
        `INSERT INTO ${table} (id, ${insertCols.join(", ")}) VALUES (${placeholders})`,
        [id, ...insertVals] as never[]
      );
      return (await this.get(id))!;
    },

    async update(id: string, data) {
      const keys = (Object.keys(data) as (keyof Omit<T, "id">)[]).filter((k) => fields.includes(k));
      const setVals = keys.map((k) => (data as Record<string, unknown>)[k as string] ?? null);
      if (fields.includes("updatedAt" as never)) {
        keys.push("updatedAt" as keyof Omit<T, "id">);
        setVals.push(new Date().toISOString());
      }
      const setCols = keys.map((k, i) => `${colFor(k)} = $${i + 1}`);
      await sql.unsafe(
        `UPDATE ${table} SET ${setCols.join(", ")} WHERE id = $${keys.length + 1}`,
        [...setVals, id] as never[]
      );
      return (await this.get(id))!;
    },

    async delete(id: string) {
      await sql.unsafe(`DELETE FROM ${table} WHERE id = $1`, [id] as never[]);
    },
  };
}

export function createPostgresAdapter(): DbAdapter {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL or DATABASE_URL must be set when DB_PROVIDER=postgres");
  const sql = postgres(url);

  const projects = sqlRepository<Project>(sql, "projects", {
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

  const experience = sqlRepository<Experience>(sql, "experience", {
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

  const skills = sqlRepository<Skill>(sql, "skills", {
    name: "name",
    category: "category",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const awards = sqlRepository<Award>(sql, "awards", {
    title: "title",
    organization: "organization",
    description: "description",
    date: "date",
    url: "url",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const education = sqlRepository<Education>(sql, "education", {
    school: "school",
    degree: "degree",
    span: "span",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const pages = sqlRepository<Page>(sql, "pages", {
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

  const guides = sqlRepository<Guide>(sql, "guides", {
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

  const platforms = sqlRepository<Platform>(sql, "platforms", {
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

  const tags = sqlRepository<Tag>(sql, "tags", {
    slug: "slug",
    name: "name",
  });

  const resources = sqlRepository<Resource>(sql, "resources", {
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

  async function getProjectBlocks(projectId: string): Promise<ProjectBlock[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM project_blocks WHERE project_id = $1 ORDER BY sort_order ASC",
      [projectId] as never[]
    );
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      type: row.type as ProjectBlock["type"],
      content: row.content as string,
      sortOrder: Number(row.sort_order),
    }));
  }

  async function replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM project_blocks WHERE project_id = $1", [projectId] as never[]);
      for (const [i, b] of blocks.entries()) {
        await tx.unsafe(
          "INSERT INTO project_blocks (id, project_id, type, content, sort_order) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), projectId, b.type, b.content, i] as never[]
        );
      }
    });
  }

  async function getGuideSteps(guideId: string): Promise<GuideStep[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM guide_steps WHERE guide_id = $1 ORDER BY sort_order ASC",
      [guideId] as never[]
    );
    return rows.map((row) => ({
      id: String(row.id),
      guideId: String(row.guide_id),
      title: (row.title as string) ?? null,
      type: row.type as GuideStep["type"],
      content: row.content as string,
      sortOrder: Number(row.sort_order),
    }));
  }

  async function replaceGuideSteps(guideId: string, steps: Omit<GuideStep, "id" | "guideId">[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM guide_steps WHERE guide_id = $1", [guideId] as never[]);
      for (const [i, s] of steps.entries()) {
        await tx.unsafe(
          "INSERT INTO guide_steps (id, guide_id, title, type, content, sort_order) VALUES ($1, $2, $3, $4, $5, $6)",
          [randomUUID(), guideId, s.title, s.type, s.content, i] as never[]
        );
      }
    });
  }

  function tagRow(row: Record<string, unknown>): Tag {
    return { id: String(row.id), slug: row.slug as string, name: row.name as string };
  }

  async function getGuideTags(guideId: string): Promise<Tag[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT t.* FROM tags t JOIN guide_tags gt ON gt.tag_id = t.id WHERE gt.guide_id = $1 ORDER BY t.name ASC",
      [guideId] as never[]
    );
    return rows.map(tagRow);
  }

  async function setGuideTags(guideId: string, tagIds: string[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM guide_tags WHERE guide_id = $1", [guideId] as never[]);
      if (tagIds.length === 0) return;
      const values = tagIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await tx.unsafe(
        `INSERT INTO guide_tags (guide_id, tag_id) VALUES ${values}`,
        [guideId, ...tagIds] as never[]
      );
    });
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
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT r.* FROM resources r
       JOIN resource_platforms rp ON rp.resource_id = r.id
       JOIN platforms p ON p.id = rp.platform_id
       WHERE p.slug = $1 ${where}
       ORDER BY r.created_at DESC`,
      [platformSlug] as never[]
    );
    return rows.map(resourceRow);
  }

  async function getResourcesForGuide(guideId: string, publicOnly = true): Promise<Resource[]> {
    const where = publicOnly ? "AND r.is_public = 1 AND r.status = 'published'" : "";
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT r.* FROM resources r
       JOIN guide_resources gr ON gr.resource_id = r.id
       WHERE gr.guide_id = $1 ${where}
       ORDER BY gr.sort_order ASC`,
      [guideId] as never[]
    );
    return rows.map(resourceRow);
  }

  async function setGuideResources(guideId: string, resourceIds: string[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM guide_resources WHERE guide_id = $1", [guideId] as never[]);
      if (resourceIds.length === 0) return;
      const values = resourceIds.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(", ");
      const args = resourceIds.flatMap((resourceId, i) => [resourceId, i]);
      await tx.unsafe(
        `INSERT INTO guide_resources (guide_id, resource_id, sort_order) VALUES ${values}`,
        [guideId, ...args] as never[]
      );
    });
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
    const args: unknown[] = [];
    let paramIndex = 1;
    if (filter.publishedOnly !== false) where.push("status = 'published'");
    if (filter.sourcePlatform) { where.push(`source_platform = $${paramIndex++}`); args.push(filter.sourcePlatform); }
    if (filter.targetPlatform) { where.push(`target_platform = $${paramIndex++}`); args.push(filter.targetPlatform); }
    const sqlText = `SELECT * FROM guides ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY sort_order ASC, id DESC`;
    const rows = await sql.unsafe<Record<string, unknown>[]>(sqlText, args as never[]);
    let list = rows.map(guideRow);
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

  async function listResources(publicOnly = true): Promise<Resource[]> {
    const where = publicOnly ? "WHERE is_public = 1 AND status = 'published'" : "";
    const rows = await sql.unsafe<Record<string, unknown>[]>(`SELECT * FROM resources ${where} ORDER BY created_at DESC`);
    return rows.map(resourceRow);
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
    migrate: () => applyPostgresMigrations(sql, postgresMigrations),
  };
}
