import type { MongoMigration } from "../../migrate-runner-mongodb";

// No seed docs -- absence of a doc for a given key means "use the built-in default" (see
// src/lib/settings.ts). value holds ciphertext (see src/lib/crypto.ts) when isSecret=1.
export const siteSettings: MongoMigration = {
  name: "0007_site_settings",
  async run(db) {
    await db.collection("site_settings").createIndex({ key: 1 }, { unique: true });
  },
};
