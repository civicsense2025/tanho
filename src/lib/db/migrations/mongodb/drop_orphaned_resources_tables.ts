import type { MongoMigration } from "../../migrate-runner-mongodb";

/** See migrations/libsql/drop_orphaned_resources_tables.ts for the full rationale. The original
 * 0010_drop_legacy_collections.ts comment listed resource_platforms as deliberately KEPT (and
 * never mentioned `resources` at all) -- both are now genuinely dead, so this drops them. A
 * separate, independently-tracked migration rather than editing that one, which may have already
 * applied to a real database. */
export const dropOrphanedResourcesTables: MongoMigration = {
  name: "drop_orphaned_resources_tables",
  async run(db) {
    for (const name of ["resource_platforms", "resources"]) {
      try {
        await db.collection(name).drop();
      } catch {
        // Collection doesn't exist -- idempotent, no-op.
      }
    }
  },
};
