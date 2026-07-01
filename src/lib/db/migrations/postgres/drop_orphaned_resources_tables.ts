import type { PostgresMigration } from "../../migrate-runner-postgres";

/** See libsql/drop_orphaned_resources_tables.ts for the full rationale. */
export const dropOrphanedResourcesTables: PostgresMigration = {
  name: "drop_orphaned_resources_tables",
  sql: ["DROP TABLE IF EXISTS resource_platforms", "DROP TABLE IF EXISTS resources"].join(";\n") + ";",
};
