export interface ListQuery<T> {
  where?: Partial<{ [K in keyof T]: T[K] | { in: T[K][] } }>;
  orderBy?: { field: keyof T; direction: "asc" | "desc" }[];
  limit?: number;
  offset?: number;
}

export interface Repository<T extends { id: string }> {
  list(query?: ListQuery<T>): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T>;
  delete(id: string): Promise<void>;
}

export type ProjectStatus = "draft" | "published";

export interface Project {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  /** @deprecated Long-form project descriptions now live in content/projects/<slug>.mdx (see src/lib/content/store.ts). This column is kept only as a read fallback for rows saved before that change. */
  description: string | null;
  coverImage: string | null;
  logoUrl: string | null;
  tags: string;
  githubUrl: string | null;
  liveUrl: string | null;
  year: number | null;
  status: ProjectStatus;
  sortOrder: number;
  /** Overrides <title>/og:title; falls back to title when unset. */
  seoTitle: string | null;
  /** Overrides <meta description>/og:description; falls back to tagline when unset. */
  seoDescription: string | null;
  /** Overrides og:image; falls back to coverImage when unset. */
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBlock {
  id: string;
  projectId: string;
  type: "text" | "image" | "video" | "metric" | "gallery";
  content: string;
  sortOrder: number;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  current: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Award {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  date: string | null;
  url: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string | null;
  span: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type PageStatus = "draft" | "published";

/** Structured metadata for a generic block-driven page (e.g. the homepage).
 * The block tree itself lives in content/pages/<slug>.json, not here -- this
 * row is what makes the page's existence/publish-state/order admin-listable
 * and queryable, following the same "DB owns structured metadata, files own
 * content" split used for projects. */
export interface Page {
  id: string;
  slug: string;
  title: string;
  route: string;
  status: PageStatus;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type GuideStatus = "draft" | "published";
export type GuideDifficulty = "beginner" | "intermediate" | "advanced";
export type CostPeriod = "monthly" | "one_time";

export interface Guide {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  summary: string | null;
  sourcePlatform: string;
  targetPlatform: string;
  difficulty: GuideDifficulty;
  effortHoursMin: number | null;
  effortHoursMax: number | null;
  costMinUsd: number | null;
  costMaxUsd: number | null;
  costPeriod: CostPeriod;
  /** JSON-encoded string[] -- see parseTags() in src/lib/utils.ts. */
  skillsRequired: string;
  /** JSON-encoded string[] -- see parseTags() in src/lib/utils.ts. */
  requirements: string;
  coverImage: string | null;
  status: GuideStatus;
  sortOrder: number;
  /** Overrides <title>/og:title; falls back to title when unset. */
  seoTitle: string | null;
  /** Overrides <meta description>/og:description; falls back to tagline when unset. */
  seoDescription: string | null;
  /** Overrides og:image; falls back to coverImage when unset. */
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuideStep {
  id: string;
  guideId: string;
  title: string | null;
  type: "text" | "image" | "video" | "code" | "callout" | "checklist";
  /** JSON-encoded, shape depends on `type` (see GuideMeta/GuideForm/step renderer). */
  content: string;
  sortOrder: number;
}

export type PlatformKind = "source" | "target" | "both";
export type PricingModel = "free_oss" | "freemium" | "paid_saas" | "usage_based";

export interface Platform {
  id: string;
  slug: string;
  name: string;
  kind: PlatformKind;
  category: string | null;
  logoUrl: string | null;
  description: string | null;
  sortOrder: number;
  officialUrl: string | null;
  isOpenSource: number;
  pricingModel: PricingModel | null;
  pricingNotes: string | null;
  githubUrl: string | null;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export type ResourceType = "article" | "video" | "forum_thread" | "docs" | "tool";

export interface Resource {
  id: string;
  title: string;
  url: string;
  sourceName: string | null;
  summary: string | null;
  resourceType: ResourceType;
  internalNotes: string | null;
  isPublic: number;
  status: GuideStatus;
  /** Overrides <title>/og:title; falls back to title when unset. */
  seoTitle: string | null;
  /** Overrides <meta description>/og:description; falls back to summary when unset. */
  seoDescription: string | null;
  /** Overrides og:image; there's no cover image on a Resource, so this has no fallback. */
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuideFilter {
  /** Defaults to true -- pass false for admin listings that should include drafts. */
  publishedOnly?: boolean;
  sourcePlatform?: string;
  targetPlatform?: string;
  maxDifficulty?: GuideDifficulty;
}

export type SeoEntityType = "project" | "guide" | "resource" | "page";

/** One row per entity type (natural key = entityType, seeded by migration), not a free-form
 * CRUD list -- so it's exposed via getSeoTemplate/upsertSeoTemplate bespoke methods below rather
 * than the generic Repository<T> shape, following the join-table precedent elsewhere in this file. */
export interface SeoTemplate {
  id: string;
  entityType: SeoEntityType;
  /** {{variable}} placeholders, resolved by resolveTemplate() in src/lib/seo.ts. */
  titleTemplate: string;
  descriptionTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbAdapter {
  projects: Repository<Project>;
  experience: Repository<Experience>;
  skills: Repository<Skill>;
  awards: Repository<Award>;
  education: Repository<Education>;
  pages: Repository<Page>;
  guides: Repository<Guide>;
  platforms: Repository<Platform>;
  tags: Repository<Tag>;
  resources: Repository<Resource>;
  /** Project blocks are keyed off projectId but have no independent sort-stable list-replace semantics in the generic Repository shape, so they get one bespoke method here rather than forcing a relational concept into the storage-agnostic interface. */
  getProjectBlocks(projectId: string): Promise<ProjectBlock[]>;
  replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void>;
  /** Guide steps are keyed off guideId with the same sort-stable list-replace shape as project blocks. */
  getGuideSteps(guideId: string): Promise<GuideStep[]>;
  replaceGuideSteps(guideId: string, steps: Omit<GuideStep, "id" | "guideId">[]): Promise<void>;
  /** guide_tags is a plain many-to-many join with no payload of its own. */
  getGuideTags(guideId: string): Promise<Tag[]>;
  setGuideTags(guideId: string, tagIds: string[]): Promise<void>;
  /** resource_platforms is a plain many-to-many join with no payload of its own. */
  getPlatformsForResource(resourceId: string): Promise<Platform[]>;
  setResourcePlatforms(resourceId: string, platformIds: string[]): Promise<void>;
  getResourcesForPlatform(platformSlug: string, publicOnly?: boolean): Promise<Resource[]>;
  /** guide_resources is a many-to-many join with a sortOrder payload, so it gets its own replace-in-order method rather than being folded into setGuideTags-style set semantics. */
  getResourcesForGuide(guideId: string, publicOnly?: boolean): Promise<Resource[]>;
  setGuideResources(guideId: string, resourceIds: string[]): Promise<void>;
  listGuides(filter?: GuideFilter): Promise<Guide[]>;
  getGuideBySlug(slug: string): Promise<Guide | undefined>;
  getPlatformBySlug(slug: string): Promise<Platform | undefined>;
  /** Upsert-by-slug, used by scripts/seed-platforms.ts to make seeding idempotent. */
  upsertPlatform(data: Omit<Platform, "id">): Promise<Platform>;
  upsertTag(data: Omit<Tag, "id">): Promise<Tag>;
  listResources(publicOnly?: boolean): Promise<Resource[]>;
  logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void>;
  /** seo_templates is a singleton-per-entityType table (seeded by migration), so it's keyed off
   * entityType rather than id -- get/upsert rather than the generic Repository<T> CRUD shape. */
  listSeoTemplates(): Promise<SeoTemplate[]>;
  getSeoTemplate(entityType: SeoEntityType): Promise<SeoTemplate | undefined>;
  upsertSeoTemplate(entityType: SeoEntityType, data: { titleTemplate: string; descriptionTemplate: string }): Promise<SeoTemplate>;
  migrate(): Promise<void>;
}
