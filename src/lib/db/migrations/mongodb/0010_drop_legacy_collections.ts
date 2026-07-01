import type { MongoMigration } from "../../migrate-runner-mongodb";

/**
 * Drops the legacy entity collections that have been replaced by content_types + content_entries.
 * Append-only and idempotent: drops are safe to re-run (no error if collection doesn't exist).
 *
 * Collections dropped: projects, project_blocks, pages, guides, guide_steps, guide_tags,
 * guide_resources, posts.
 *
 * Collections KEPT: experience, skills, awards, education, platforms, tags, subscribers,
 * post_deliveries, orders, subscriptions, seo_templates, site_settings, content_types,
 * content_entries, collections, content_entry_collections, content_entry_tags,
 * resource_platforms.
 */
export const dropLegacyCollections: MongoMigration = {
  name: "0010_drop_legacy_collections",
  async run(db) {
    const collections = ["projects", "project_blocks", "pages", "guides", "guide_steps", "guide_tags", "guide_resources", "posts"];
    for (const name of collections) {
      try {
        await db.collection(name).drop();
      } catch {
        // Collection doesn't exist — idempotent, no-op.
      }
    }
  },
};
