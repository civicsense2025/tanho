import type { MongoMigration } from "../../migrate-runner-mongodb";

export const pages: MongoMigration = {
  name: "0002_pages",
  async run(db) {
    await db.collection("pages").createIndex({ slug: 1 }, { unique: true });
  },
};
