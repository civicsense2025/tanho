import type { MongoMigration } from "../../migrate-runner-mongodb";

export const contentTypes: MongoMigration = {
  name: "0008_content_types",
  async run(db) {
    await db.collection("content_types").createIndex({ slug: 1 }, { unique: true });
    await db.collection("content_entries").createIndex({ contentTypeId: 1 });
    await db.collection("content_entries").createIndex({ contentTypeId: 1, slug: 1 }, { unique: true });
    await db.collection("collections").createIndex({ slug: 1 }, { unique: true });
    await db.collection("content_entry_collections").createIndex({ contentEntryId: 1, collectionId: 1 }, { unique: true });
    await db.collection("content_entry_tags").createIndex({ contentEntryId: 1, tagId: 1 }, { unique: true });
  },
};
