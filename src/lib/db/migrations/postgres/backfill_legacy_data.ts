import type { Sql } from "postgres";
import type { PostgresMigration } from "../../migrate-runner-postgres";
import { tablesExist } from "../../migrate-runner-postgres";

/** See libsql/backfill_legacy_data.ts for the full rationale. Same per-entity guard strategy,
 * postgres JSON functions (json_build_object/json_agg) cast to ::text since content_entries.data
 * is a TEXT column, not json/jsonb. */

const RESOLVE_TYPE_ID = (slug: string) => `(SELECT id FROM content_types WHERE slug = '${slug}')`;

const backfillProjects: PostgresMigration = {
  name: "backfill_legacy_projects",
  guard: (sql: Sql) => tablesExist(sql, ["projects", "project_blocks"]),
  sql: `
INSERT INTO content_entries (id, content_type_id, slug, title, status, scheduled_at, published_at, sort_order, seo_title, seo_description, og_image, canonical_url, no_index, data, created_at, updated_at)
SELECT
  gen_random_uuid(), ${RESOLVE_TYPE_ID("project")}, p.slug, p.title, p.status, NULL, NULL, p.sort_order, NULL, NULL, NULL, NULL, 0,
  json_build_object(
    'tagline', p.tagline, 'coverImage', p.cover_image, 'logoUrl', p.logo_url, 'tags', COALESCE(p.tags::json, '[]'::json),
    'githubUrl', p.github_url, 'liveUrl', p.live_url, 'year', p.year,
    'blocks', COALESCE((SELECT json_agg(json_build_object('type', pb.type, 'content', pb.content::json, 'sortOrder', pb.sort_order)) FROM project_blocks pb WHERE pb.project_id = p.id), '[]'::json)
  )::text,
  p.created_at, p.updated_at
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM content_entries ce WHERE ce.content_type_id = ${RESOLVE_TYPE_ID("project")} AND ce.slug = p.slug);
`,
};

const backfillGuides: PostgresMigration = {
  name: "backfill_legacy_guides",
  guard: (sql: Sql) => tablesExist(sql, ["guides", "guide_steps"]),
  sql: `
INSERT INTO content_entries (id, content_type_id, slug, title, status, scheduled_at, published_at, sort_order, seo_title, seo_description, og_image, canonical_url, no_index, data, created_at, updated_at)
SELECT
  gen_random_uuid(), ${RESOLVE_TYPE_ID("guide")}, g.slug, g.title, g.status, NULL, NULL, g.sort_order, g.seo_title, g.seo_description, g.og_image, g.canonical_url, g.no_index,
  json_build_object(
    'tagline', g.tagline, 'summary', g.summary, 'sourcePlatform', g.source_platform, 'targetPlatform', g.target_platform,
    'difficulty', g.difficulty, 'effortHoursMin', g.effort_hours_min, 'effortHoursMax', g.effort_hours_max,
    'costMinUsd', g.cost_min_usd, 'costMaxUsd', g.cost_max_usd, 'costPeriod', g.cost_period,
    'skillsRequired', COALESCE(g.skills_required::json, '[]'::json), 'requirements', COALESCE(g.requirements::json, '[]'::json), 'coverImage', g.cover_image,
    'blocks', COALESCE((SELECT json_agg(json_build_object('type', gs.type, 'content', gs.content::json, 'sortOrder', gs.sort_order)) FROM guide_steps gs WHERE gs.guide_id = g.id), '[]'::json)
  )::text,
  g.created_at, g.updated_at
FROM guides g
WHERE NOT EXISTS (SELECT 1 FROM content_entries ce WHERE ce.content_type_id = ${RESOLVE_TYPE_ID("guide")} AND ce.slug = g.slug);
`,
};

const backfillPosts: PostgresMigration = {
  name: "backfill_legacy_posts",
  guard: (sql: Sql) => tablesExist(sql, ["posts"]),
  sql: `
INSERT INTO content_entries (id, content_type_id, slug, title, status, scheduled_at, published_at, sort_order, seo_title, seo_description, og_image, canonical_url, no_index, data, created_at, updated_at)
SELECT
  gen_random_uuid(), ${RESOLVE_TYPE_ID("post")}, po.slug, po.title, po.status, NULL, po.published_at, po.sort_order, po.seo_title, po.seo_description, po.og_image, po.canonical_url, po.no_index,
  json_build_object('subtitle', po.subtitle, 'excerpt', po.excerpt, 'coverImage', po.cover_image, 'visibility', po.visibility, 'body', '')::text,
  po.created_at, po.updated_at
FROM posts po
WHERE NOT EXISTS (SELECT 1 FROM content_entries ce WHERE ce.content_type_id = ${RESOLVE_TYPE_ID("post")} AND ce.slug = po.slug);
`,
};

const backfillPages: PostgresMigration = {
  name: "backfill_legacy_pages",
  guard: (sql: Sql) => tablesExist(sql, ["pages"]),
  sql: `
INSERT INTO content_entries (id, content_type_id, slug, title, status, scheduled_at, published_at, sort_order, seo_title, seo_description, og_image, canonical_url, no_index, data, created_at, updated_at)
SELECT
  gen_random_uuid(), ${RESOLVE_TYPE_ID("page")}, pg.slug, pg.title, pg.status, NULL, NULL, pg.sort_order, NULL, NULL, NULL, NULL, 0,
  json_build_object('blocks', '[]'::json)::text,
  pg.created_at, pg.updated_at
FROM pages pg
WHERE NOT EXISTS (SELECT 1 FROM content_entries ce WHERE ce.content_type_id = ${RESOLVE_TYPE_ID("page")} AND ce.slug = pg.slug);
`,
};

const backfillResources: PostgresMigration = {
  name: "backfill_legacy_resources",
  guard: (sql: Sql) => tablesExist(sql, ["resources"]),
  sql: `
INSERT INTO content_entries (id, content_type_id, slug, title, status, scheduled_at, published_at, sort_order, seo_title, seo_description, og_image, canonical_url, no_index, data, created_at, updated_at)
SELECT
  gen_random_uuid(), ${RESOLVE_TYPE_ID("resource")}, replace(gen_random_uuid()::text, '-', ''), r.title, r.status, NULL, NULL, 0, r.seo_title, r.seo_description, r.og_image, r.canonical_url, r.no_index,
  json_build_object('url', r.url, 'sourceName', r.source_name, 'summary', r.summary, 'resourceType', r.resource_type, 'internalNotes', r.internal_notes, 'isPublic', r.is_public)::text,
  r.created_at, r.updated_at
FROM resources r
WHERE NOT EXISTS (
  SELECT 1 FROM content_entries ce
  WHERE ce.content_type_id = ${RESOLVE_TYPE_ID("resource")} AND ce.data::json->>'url' = r.url
);
`,
};

// Resource never had a slug column (title/url instead) -- a random one is generated. Matched
// for idempotency by URL instead of slug, since two different random slugs would otherwise
// never collide and a retry would duplicate every resource.
export const backfillLegacyData: PostgresMigration[] = [backfillProjects, backfillGuides, backfillPosts, backfillPages, backfillResources];
