import type { SqlMigration } from "../../migrate-runner";

/**
 * The original drop-legacy-tables migration's own comment claimed `resources` was removed, but
 * its actual DROP list never included it -- `resources` and `resource_platforms` were left
 * behind, permanently empty (Resource is now a content_entries type; nothing writes to the old
 * table anymore). The Resource<->Platform linking feature itself is also gone from the product:
 * both /guides/resources and /guides/platform/[slug] were rewritten during the cutover to filter
 * guides by their own sourcePlatform/targetPlatform fields directly, never consulting this join
 * (confirmed zero callers of getPlatformsForResource/setResourcePlatforms/getResourcesForPlatform
 * anywhere in src/app or src/components). A separate, independently-tracked migration rather
 * than editing the original drop (which may have already applied to a real database).
 */
export const dropOrphanedResourcesTables: SqlMigration = {
  name: "drop_orphaned_resources_tables",
  sql: ["DROP TABLE IF EXISTS resource_platforms", "DROP TABLE IF EXISTS resources"].join(";\n") + ";",
};
