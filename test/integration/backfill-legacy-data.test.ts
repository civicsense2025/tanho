import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * End-to-end regression test for the defensive backfill migration: inserts real sample rows
 * into the legacy tables/collections BEFORE the backfill+drop migrations run (simulating a
 * populated pre-cutover database updating via `git pull`), then asserts the data landed
 * correctly in content_entries and the old tables/collections are genuinely gone afterward.
 * The postgres equivalent was verified manually against a real Postgres 16 container (dialect-
 * specific SQL -- json_build_object/gen_random_uuid -- isn't exercised by libsql/mongo, so this
 * doesn't replace that, but does cover the two zero-infra backends every run.
 */

describe("backfill_legacy_data [libsql]", () => {
  let dir: string | null = null;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it("migrates real guide/project/resource rows into content_entries before the drop", async () => {
    const { createClient } = await import("@libsql/client");
    const { applyMigrations } = await import("@/lib/db/migrate-runner");
    const { libsqlMigrations } = await import("@/lib/db/migrations/libsql/index");

    dir = mkdtempSync(join(tmpdir(), "tanho-backfill-test-"));
    const client = createClient({ url: `file:${join(dir, "test.db")}` });

    const seedIndex = libsqlMigrations.findIndex((m) => m.name === "fix_guide_seed_blocks_field");
    expect(seedIndex).toBeGreaterThan(-1);

    // Run everything up to the seed+fix -- old tables exist, content_types is seeded.
    await applyMigrations(client, libsqlMigrations.slice(0, seedIndex + 1));

    // Insert sample data into the old tables, simulating a real pre-cutover database.
    await client.execute(`
      INSERT INTO guides (id, slug, title, tagline, summary, source_platform, target_platform, difficulty, effort_hours_min, effort_hours_max, cost_min_usd, cost_max_usd, cost_period, skills_required, requirements, cover_image, status, sort_order)
      VALUES ('guide-1', 'my-guide', 'My Test Guide', 'A tagline', 'A summary', 'notion', 'obsidian', 'intermediate', 2, 5, 0, 20, 'monthly', '["writing"]', '["a notion account"]', 'https://example.com/cover.png', 'published', 0)
    `);
    await client.execute(`
      INSERT INTO guide_steps (id, guide_id, title, type, content, sort_order)
      VALUES ('step-1', 'guide-1', 'Step One', 'text', '{"html":"<p>first step</p>"}', 0),
             ('step-2', 'guide-1', 'Step Two', 'code', '{"code":"const x = 1;","filename":"example.ts"}', 1)
    `);
    await client.execute(`
      INSERT INTO projects (id, slug, title, tagline, tags, status, sort_order)
      VALUES (1, 'my-project', 'My Test Project', 'A project tagline', '["ts","react"]', 'published', 0)
    `);
    await client.execute(`
      INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (1, 'text', '{"html":"<p>project body</p>"}', 0)
    `);
    await client.execute(`
      INSERT INTO resources (id, title, url, source_name, summary, resource_type, is_public, status)
      VALUES ('res-1', 'A Resource', 'https://example.com/resource', 'Example', 'A summary', 'article', 1, 'published')
    `);

    // Run the rest -- backfill runs while old tables still exist, then drop removes them.
    await applyMigrations(client, libsqlMigrations.slice(seedIndex + 1));

    const entries = await client.execute(`SELECT slug, title, data FROM content_entries`);
    expect(entries.rows).toHaveLength(3);

    const guideEntry = entries.rows.find((r) => r.slug === "my-guide");
    expect(guideEntry).toBeDefined();
    const guideData = JSON.parse(guideEntry!.data as string);
    expect(guideData.tagline).toBe("A tagline");
    expect(guideData.skillsRequired).toEqual(["writing"]);
    expect(guideData.blocks).toEqual([
      { type: "text", content: { html: "<p>first step</p>" }, sortOrder: 0 },
      { type: "code", content: { code: "const x = 1;", filename: "example.ts" }, sortOrder: 1 },
    ]);

    const projectEntry = entries.rows.find((r) => r.slug === "my-project");
    expect(projectEntry).toBeDefined();
    const projectData = JSON.parse(projectEntry!.data as string);
    expect(projectData.tags).toEqual(["ts", "react"]);
    expect(projectData.blocks).toEqual([{ type: "text", content: { html: "<p>project body</p>" }, sortOrder: 0 }]);

    const resourceEntry = entries.rows.find((r) => r.title === "A Resource");
    expect(resourceEntry).toBeDefined();
    const resourceData = JSON.parse(resourceEntry!.data as string);
    expect(resourceData.url).toBe("https://example.com/resource");

    // Old tables (except resources, a separately-tracked gap) are genuinely gone.
    const oldTables = await client.execute(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('guides','guide_steps','projects','project_blocks','pages','posts')`
    );
    expect(oldTables.rows).toHaveLength(0);

    // A second full migrate() pass is a no-op, not a duplicate-insert.
    await applyMigrations(client, libsqlMigrations);
    const entriesAfterRerun = await client.execute(`SELECT slug FROM content_entries`);
    expect(entriesAfterRerun.rows).toHaveLength(3);

    client.close();
  });

  it("is a genuine no-op when the old tables never had any rows (this instance's actual case)", async () => {
    const { createClient } = await import("@libsql/client");
    const { applyMigrations } = await import("@/lib/db/migrate-runner");
    const { libsqlMigrations } = await import("@/lib/db/migrations/libsql/index");

    dir = mkdtempSync(join(tmpdir(), "tanho-backfill-empty-test-"));
    const client = createClient({ url: `file:${join(dir, "test.db")}` });
    await applyMigrations(client, libsqlMigrations); // full run, old tables created empty then dropped

    const entries = await client.execute(`SELECT * FROM content_entries`);
    expect(entries.rows).toHaveLength(0);
    client.close();
  });
});

describe("backfill_legacy_data [mongodb]", () => {
  let server: import("mongodb-memory-server").MongoMemoryServer | null = null;

  afterEach(async () => {
    if (server) await server.stop();
    server = null;
  });

  it("migrates real guide/project/resource documents into content_entries before the drop", async () => {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const { MongoClient } = await import("mongodb");
    const { applyMongoMigrations } = await import("@/lib/db/migrate-runner-mongodb");
    const { mongoMigrations } = await import("@/lib/db/migrations/mongodb/index");

    server = await MongoMemoryServer.create();
    const client = new MongoClient(server.getUri());
    await client.connect();
    const db = client.db("tanho_backfill_test");

    const seedIndex = mongoMigrations.findIndex((m) => m.name === "fix_guide_seed_blocks_field");
    expect(seedIndex).toBeGreaterThan(-1);

    await applyMongoMigrations(db, mongoMigrations.slice(0, seedIndex + 1));

    await db.collection("guides").insertOne({
      id: "guide-1", slug: "my-guide", title: "My Test Guide", tagline: "A tagline", summary: "A summary",
      sourcePlatform: "notion", targetPlatform: "obsidian", difficulty: "intermediate",
      effortHoursMin: 2, effortHoursMax: 5, costMinUsd: 0, costMaxUsd: 20, costPeriod: "monthly",
      skillsRequired: JSON.stringify(["writing"]), requirements: JSON.stringify(["a notion account"]),
      coverImage: "https://example.com/cover.png", status: "published", sortOrder: 0,
    });
    await db.collection("guide_steps").insertMany([
      { guideId: "guide-1", title: "Step One", type: "text", content: JSON.stringify({ html: "<p>first step</p>" }), sortOrder: 0 },
      { guideId: "guide-1", title: "Step Two", type: "code", content: JSON.stringify({ code: "const x = 1;", filename: "example.ts" }), sortOrder: 1 },
    ]);
    await db.collection("projects").insertOne({
      id: "project-1", slug: "my-project", title: "My Test Project", tagline: "A project tagline",
      tags: JSON.stringify(["ts", "react"]), status: "published", sortOrder: 0,
    });
    await db.collection("project_blocks").insertOne({
      projectId: "project-1", type: "text", content: JSON.stringify({ html: "<p>project body</p>" }), sortOrder: 0,
    });
    await db.collection("resources").insertOne({
      id: "res-1", title: "A Resource", url: "https://example.com/resource", sourceName: "Example",
      summary: "A summary", resourceType: "article", isPublic: 1, status: "published",
    });

    await applyMongoMigrations(db, mongoMigrations.slice(seedIndex + 1));

    const entries = await db.collection("content_entries").find({}).toArray();
    expect(entries).toHaveLength(3);

    const guideEntry = entries.find((e) => e.slug === "my-guide");
    expect(guideEntry).toBeDefined();
    const guideData = JSON.parse(guideEntry!.data as string);
    expect(guideData.tagline).toBe("A tagline");
    expect(guideData.skillsRequired).toEqual(["writing"]);
    expect(guideData.blocks).toEqual([
      { type: "text", content: { html: "<p>first step</p>" }, sortOrder: 0 },
      { type: "code", content: { code: "const x = 1;", filename: "example.ts" }, sortOrder: 1 },
    ]);

    const projectEntry = entries.find((e) => e.slug === "my-project");
    expect(projectEntry).toBeDefined();
    const projectData = JSON.parse(projectEntry!.data as string);
    expect(projectData.tags).toEqual(["ts", "react"]);
    expect(projectData.blocks).toEqual([{ type: "text", content: { html: "<p>project body</p>" }, sortOrder: 0 }]);

    const resourceEntry = entries.find((e) => e.title === "A Resource");
    expect(resourceEntry).toBeDefined();
    expect(JSON.parse(resourceEntry!.data as string).url).toBe("https://example.com/resource");

    // Old collections (except resources, a separately-tracked gap) are genuinely gone.
    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);
    for (const old of ["guides", "guide_steps", "projects", "project_blocks", "pages", "posts"]) {
      expect(collectionNames, `expected ${old} to be dropped`).not.toContain(old);
    }

    // A second full migrate() pass is a no-op, not a duplicate-insert.
    await applyMongoMigrations(db, mongoMigrations);
    expect(await db.collection("content_entries").countDocuments()).toBe(3);

    await client.close();
  });
});
