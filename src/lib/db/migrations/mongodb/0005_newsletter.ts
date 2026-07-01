import type { MongoMigration } from "../../migrate-runner-mongodb";

export const newsletter: MongoMigration = {
  name: "0005_newsletter",
  async run(db) {
    await db.collection("posts").createIndex({ slug: 1 }, { unique: true });
    await db.collection("subscribers").createIndex({ email: 1 }, { unique: true });
    await db.collection("subscribers").createIndex({ unsubscribeToken: 1 });
    await db.collection("subscribers").createIndex({ confirmToken: 1 });
    await db.collection("post_deliveries").createIndex({ postId: 1, subscriberId: 1 }, { unique: true });
    await db.collection("post_deliveries").createIndex({ postId: 1 });
  },
};
