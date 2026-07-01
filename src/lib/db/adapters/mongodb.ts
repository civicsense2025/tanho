import { MongoClient, type Collection, type Db, type Filter } from "mongodb";
import { randomUUID } from "crypto";
import type {
  Award,
  DbAdapter,
  Education,
  Experience,
  ListQuery,
  Project,
  ProjectBlock,
  Repository,
  Skill,
} from "../types";
import { applyMongoMigrations } from "../migrate-runner-mongodb";
import { mongoMigrations } from "../migrations/mongodb";

/**
 * Documents store the app-level string `id` as their own `id` field (not `_id`
 * -- Mongo's ObjectId), so callers never see or reason about ObjectId. `_id`
 * is left to Mongo's own default and simply stripped on the way out.
 */
function mongoRepository<T extends { id: string }>(collection: Collection): Repository<T> {
  function fromDoc(doc: Record<string, unknown>): T {
    const { _id, ...rest } = doc;
    void _id;
    return rest as T;
  }

  return {
    async list(query?: ListQuery<T>) {
      const filter: Filter<Record<string, unknown>> = {};
      if (query?.where) {
        for (const [key, value] of Object.entries(query.where)) {
          if (value && typeof value === "object" && "in" in (value as object)) {
            filter[key] = { $in: (value as { in: unknown[] }).in };
          } else {
            filter[key] = value;
          }
        }
      }
      let cursor = collection.find(filter);
      if (query?.orderBy?.length) {
        const sort: Record<string, 1 | -1> = {};
        for (const o of query.orderBy) sort[o.field as string] = o.direction === "asc" ? 1 : -1;
        cursor = cursor.sort(sort);
      }
      if (query?.offset) cursor = cursor.skip(query.offset);
      if (query?.limit) cursor = cursor.limit(query.limit);
      const docs = await cursor.toArray();
      return docs.map((d) => fromDoc(d as Record<string, unknown>));
    },

    async get(id: string) {
      const doc = await collection.findOne({ id });
      return doc ? fromDoc(doc as Record<string, unknown>) : undefined;
    },

    async create(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const doc = { id, ...data, createdAt: now, updatedAt: now };
      await collection.insertOne(doc as never);
      return (await this.get(id))!;
    },

    async update(id: string, data) {
      const update: Record<string, unknown> = { ...data };
      update.updatedAt = new Date().toISOString();
      await collection.updateOne({ id }, { $set: update });
      return (await this.get(id))!;
    },

    async delete(id: string) {
      await collection.deleteOne({ id });
    },
  };
}

export function createMongoAdapter(): DbAdapter {
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error("MONGODB_URL must be set when DB_PROVIDER=mongodb");
  const client = new MongoClient(url);
  const dbName = process.env.MONGODB_DB || "cms";
  let db: Db;

  function getDb(): Db {
    if (!db) db = client.db(dbName);
    return db;
  }

  const projects = mongoRepository<Project>(getDb().collection("projects"));
  const experience = mongoRepository<Experience>(getDb().collection("experience"));
  const skills = mongoRepository<Skill>(getDb().collection("skills"));
  const awards = mongoRepository<Award>(getDb().collection("awards"));
  const education = mongoRepository<Education>(getDb().collection("education"));

  async function getProjectBlocks(projectId: string): Promise<ProjectBlock[]> {
    const docs = await getDb()
      .collection("project_blocks")
      .find({ projectId })
      .sort({ sortOrder: 1 })
      .toArray();
    return docs.map((d) => ({
      id: d.id as string,
      projectId: d.projectId as string,
      type: d.type as ProjectBlock["type"],
      content: d.content as string,
      sortOrder: d.sortOrder as number,
    }));
  }

  async function replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
    const collection = getDb().collection("project_blocks");
    await collection.deleteMany({ projectId });
    if (blocks.length === 0) return;
    await collection.insertMany(
      blocks.map((b, i) => ({ id: randomUUID(), projectId, type: b.type, content: b.content, sortOrder: i }))
    );
  }

  return {
    projects,
    experience,
    skills,
    awards,
    education,
    getProjectBlocks,
    replaceProjectBlocks,
    async migrate() {
      await client.connect();
      await applyMongoMigrations(getDb(), mongoMigrations);
    },
  };
}
