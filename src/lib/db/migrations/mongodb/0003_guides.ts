import type { MongoMigration } from "../../migrate-runner-mongodb";

export const guides: MongoMigration = {
  name: "0003_guides",
  async run(db) {
    await db.collection("platforms").createIndex({ slug: 1 }, { unique: true });
    await db.collection("tags").createIndex({ slug: 1 }, { unique: true });
    await db.collection("guides").createIndex({ slug: 1 }, { unique: true });
    await db.collection("guide_steps").createIndex({ guideId: 1 });
    await db.collection("guide_tags").createIndex({ guideId: 1, tagId: 1 }, { unique: true });
    await db.collection("resource_platforms").createIndex({ resourceId: 1, platformId: 1 }, { unique: true });
    await db.collection("guide_resources").createIndex({ guideId: 1, resourceId: 1 }, { unique: true });
  },
};
