import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { analyticsEvents } from "./schema";
import { orderItems, orders } from "@/modules/commerce/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

async function seedView(personId: string, path: string, at: number) {
  await testDb.insert(analyticsEvents).values({ name: "pageview", personId, path, at });
}

async function seedOrder(id: string, personId: string, status: string, placedAt: number, itemName: string) {
  await testDb.insert(orders).values({
    id,
    code: id,
    personId,
    email: `${personId}@example.com`,
    status: status as "paid",
    placedAt,
  });
  await testDb.insert(orderItems).values({ orderId: id, name: itemName });
}

describe("contentToPurchaseCorrelations", () => {
  it("counts a person who viewed a page then bought a product within the window", async () => {
    const now = Date.now();
    const viewedAt = now - 20 * DAY_MS;
    await seedView("p1", "/essays/why-migrate", viewedAt);
    await seedOrder("o1", "p1", "paid", viewedAt + 5 * DAY_MS, "Starter Kit");

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14);
    expect(rows).toEqual([{ path: "/essays/why-migrate", productName: "Starter Kit", personCount: 1 }]);
  });

  it("excludes a purchase that falls outside the window", async () => {
    const now = Date.now();
    const viewedAt = now - 20 * DAY_MS;
    await seedView("p2", "/essays/why-migrate", viewedAt);
    await seedOrder("o2", "p2", "paid", viewedAt + 20 * DAY_MS, "Starter Kit");

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14);
    expect(rows).toEqual([]);
  });

  it("excludes a purchase that happened before the view", async () => {
    const now = Date.now();
    const viewedAt = now - 5 * DAY_MS;
    await seedView("p3", "/essays/why-migrate", viewedAt);
    await seedOrder("o3", "p3", "paid", viewedAt - 1 * DAY_MS, "Starter Kit");

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14);
    expect(rows).toEqual([]);
  });

  it("excludes pending, refunded, disputed, and cancelled orders", async () => {
    const now = Date.now();
    const viewedAt = now - 20 * DAY_MS;
    let i = 0;
    for (const status of ["pending", "refunded", "disputed", "cancelled"]) {
      await seedView(`px${i}`, "/essays/why-migrate", viewedAt);
      await seedOrder(`ox${i}`, `px${i}`, status, viewedAt + 1 * DAY_MS, "Starter Kit");
      i++;
    }

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14);
    expect(rows).toEqual([]);
  });

  it("includes unfulfilled and fulfilled orders as real purchases", async () => {
    const now = Date.now();
    const viewedAt = now - 20 * DAY_MS;
    await seedView("p4", "/essays/why-migrate", viewedAt);
    await seedOrder("o4", "p4", "unfulfilled", viewedAt + 1 * DAY_MS, "Starter Kit");
    await seedView("p5", "/essays/why-migrate", viewedAt);
    await seedOrder("o5", "p5", "fulfilled", viewedAt + 1 * DAY_MS, "Starter Kit");

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14);
    expect(rows).toEqual([{ path: "/essays/why-migrate", productName: "Starter Kit", personCount: 2 }]);
  });

  it("counts each person once even if they viewed the page multiple times", async () => {
    const now = Date.now();
    const viewedAt = now - 20 * DAY_MS;
    await seedView("p6", "/essays/why-migrate", viewedAt);
    await seedView("p6", "/essays/why-migrate", viewedAt + 1 * DAY_MS);
    await seedOrder("o6", "p6", "paid", viewedAt + 2 * DAY_MS, "Starter Kit");

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14);
    expect(rows).toEqual([{ path: "/essays/why-migrate", productName: "Starter Kit", personCount: 1 }]);
  });

  it("ranks pairs by personCount descending and respects the limit", async () => {
    const now = Date.now();
    const viewedAt = now - 20 * DAY_MS;
    for (const id of ["p7", "p8"]) {
      await seedView(id, "/essays/popular", viewedAt);
      await seedOrder(`o-${id}`, id, "paid", viewedAt + 1 * DAY_MS, "Popular Product");
    }
    await seedView("p9", "/essays/less-popular", viewedAt);
    await seedOrder("o-p9", "p9", "paid", viewedAt + 1 * DAY_MS, "Less Popular Product");

    const { contentToPurchaseCorrelations } = await import("./correlation");
    const rows = await contentToPurchaseCorrelations(14, 1);
    expect(rows).toEqual([{ path: "/essays/popular", productName: "Popular Product", personCount: 2 }]);
  });
});
