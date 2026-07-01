import { randomUUID } from "crypto";
import type { MongoMigration } from "../../migrate-runner-mongodb";

const DEFAULTS: { entityType: string; titleTemplate: string; descriptionTemplate: string }[] = [
  { entityType: "project", titleTemplate: "{{title}} — Tan Ho", descriptionTemplate: "{{tagline}}" },
  { entityType: "guide", titleTemplate: "{{title}} — Migration Guide", descriptionTemplate: "{{summary}}" },
  { entityType: "resource", titleTemplate: "{{title}}", descriptionTemplate: "{{summary}}" },
  { entityType: "page", titleTemplate: "{{title}} — Tan Ho", descriptionTemplate: "{{title}}" },
];

export const seoTemplates: MongoMigration = {
  name: "0004_seo_templates",
  async run(db) {
    await db.collection("seo_templates").createIndex({ entityType: 1 }, { unique: true });
    const now = new Date().toISOString();
    for (const d of DEFAULTS) {
      await db.collection("seo_templates").updateOne(
        { entityType: d.entityType },
        { $setOnInsert: { id: randomUUID(), ...d, createdAt: now, updatedAt: now } },
        { upsert: true }
      );
    }
  },
};
