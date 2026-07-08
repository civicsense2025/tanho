import { eq } from "drizzle-orm";
import { customTypes } from "../../src/modules/custom-types/schema";
import { createTableStatements, tableNameForSlug } from "../../src/modules/content-schema/ddl";
import { currentDialect } from "../../src/modules/content-schema/dialect";
import { BUILTIN_CT_TYPES } from "../../src/modules/content-schema/builtin-types";
import { log, type SeedDb } from "../lib";

/**
 * Seed the three built-in data-backed content types (Projects, Guides,
 * Resources) as real `ct_*` tables. These are created at seed time so a fresh
 * install ships with them ready to use — the owner doesn't have to create them
 * manually. Idempotent: if the type already exists (by slug), it's skipped.
 *
 * This replaces the old pattern where Projects/Guides/Resources were
 * JSON-backed entries in the shared `entries` table. They're now first-class
 * tables with one typed column per field, managed through the same
 * content-schema layer as owner-created custom types.
 */
export async function seedContentTypes(db: SeedDb): Promise<void> {
  const dialect = currentDialect();

  for (const type of BUILTIN_CT_TYPES) {
    // Check if this type is already registered
    const existing = await db.query.customTypes.findFirst({
      where: eq(customTypes.slug, type.slug),
    });
    if (existing) {
      log(`content-type ${type.slug}: already exists — skipping`);
      continue;
    }

    const tableName = tableNameForSlug(type.slug);

    // Create the physical table (DDL first, then metadata — same order as
    // createTableBackedType in content-schema/actions.ts).
    for (const stmt of createTableStatements(tableName, [...type.fields], dialect)) {
      await db.run(stmt);
    }

    // Write the metadata row.
    await db.insert(customTypes).values({
      slug: type.slug,
      name: type.name,
      pluralName: type.pluralName,
      fields: [...type.fields],
      tableName,
      basePath: type.basePath,
      titleField: type.titleField,
      slugField: type.slugField,
      status: "published",
      updatedAt: Date.now(),
    });

    log(`content-type ${type.slug}: created table ${tableName}`);
  }
}
