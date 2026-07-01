import type { SqlMigration } from "../../migrate-runner";

/**
 * Drops the legacy entity tables that have been replaced by content_types + content_entries.
 * Append-only and idempotent: uses DROP TABLE IF EXISTS so re-running migrate() is safe.
 */
export const dropLegacyTables: SqlMigration = {
  name: "0011_drop_legacy_entity_tables",
  sql: [
    "DROP TABLE IF EXISTS project_blocks",
    "DROP TABLE IF EXISTS projects",
    "DROP TABLE IF EXISTS guide_steps",
    "DROP TABLE IF EXISTS guide_tags",
    "DROP TABLE IF EXISTS guide_resources",
    "DROP TABLE IF EXISTS guides",
    "DROP TABLE IF EXISTS pages",
    "DROP TABLE IF EXISTS posts",
  ].join(";\n") + ";",
};
