import type { MongoMigration } from "../../migrate-runner-mongodb";

export const payments: MongoMigration = {
  name: "0006_payments",
  async run(db) {
    await db.collection("orders").createIndex({ stripeCheckoutSessionId: 1 }, { unique: true });
    await db.collection("orders").createIndex({ customerEmail: 1 });
    await db.collection("subscriptions").createIndex({ stripeSubscriptionId: 1 }, { unique: true });
    await db.collection("subscriptions").createIndex({ customerEmail: 1 });
  },
};
