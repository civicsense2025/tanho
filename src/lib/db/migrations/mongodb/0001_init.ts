import type { MongoMigration } from "../../migrate-runner-mongodb";

export const init: MongoMigration = {
  name: "0001_init",
  async run(db) {
    await db.collection("_migrations").createIndex({ name: 1 }, { unique: true });
    await db.collection("projects").createIndex({ slug: 1 }, { unique: true });
  },
};
