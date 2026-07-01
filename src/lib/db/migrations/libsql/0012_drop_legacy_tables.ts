import type { SqlMigration } from "../../migrate-runner";

/**
 * Drops the legacy entity tables that have been replaced by content_types + content_entries.
 * Append-only and idempotent: uses DROP TABLE IF EXISTS so re-running migrate() is safe.
 *
 * Tables dropped: projects, project_blocks, pages, guides, guide_steps, guide_tags,
 * guide_resources, resources, resource_platforms, posts.
 *
 * Tables KEPT: experience, skills, awards, education, platforms, tags, subscribers,
 * post_deliveries, orders, subscriptions, seo_templates, site_settings, content_types,
 * content_entries, collections, content_entry_collections, content_entry_tags,
 * resource_platforms (still used to link content_entries to platforms).
 */
export const dropLegacyTables: SqlMigration = {
  name: "0012_drop_legacy_entity_tables",
  sql: [
    "DROP TABLE IF EXISTS project_blocks",
    "DROP TABLE IF EXISTS projects",
    "DROP TABLE IF EXISTS guide_steps",
    "DROP TABLE IF EXISTS guide_tags",
    "DROP TABLE IF EXISTS guide_resources",
    "DROP TABLE IF EXISTS guides",
    "DROP TABLE IF EXISTS pages",
    "DROP TABLE IF EXISTS posts",
    // Note: resources table is gone — resource entries now live in content_entries.
    // resource_platforms is KEPT (links content_entries to platforms).
  ].join(";\n") + ";",
};
