import type { Db } from "mongodb";

export interface MongoMigration {
  name: string;
  run: (db: Db) => Promise<void>;
}

export async function applyMongoMigrations(db: Db, migrations: MongoMigration[]): Promise<void> {
  const migrationsCollection = db.collection("_migrations");
  const applied = await migrationsCollection.find({}).toArray();
  const appliedNames = new Set(applied.map((r) => r.name as string));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;
    await migration.run(db);
    await migrationsCollection.updateOne({ name: migration.name }, { $setOnInsert: { name: migration.name, appliedAt: new Date().toISOString() } }, { upsert: true });
  }
}
