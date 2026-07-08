import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the db client. The queries module uses:
//   - db.query.<table>.findMany / findFirst  (relational query API)
//   - db.insert(table).values(v).onConflictDoUpdate(...).returning()
//   - db.update(table).set(s).where(...)
//   - db.delete(table).where(...)
//   - db.select().from().innerJoin().where().limit()  (computeVerified for products)
//
// Each db.query.<table> is an object with `findMany` and `findFirst` mock fns.
// Pre-create the mocks the tests configure directly (the Proxy only lazily
// creates them on db.query.X access, which happens AFTER the test sets up its
// return value, so a direct findManyMocks.references would be undefined).
const findManyMocks: Record<string, ReturnType<typeof vi.fn>> = {
  reviews: vi.fn(),
  memberships: vi.fn(),
  reviewReplies: vi.fn(),
  reviewVotes: vi.fn(),
  people: vi.fn(),
};
const findFirstMocks: Record<string, ReturnType<typeof vi.fn>> = {
  reviewTargets: vi.fn(),
  reviewAggregates: vi.fn(),
  reviewReplies: vi.fn(),
  reviewVotes: vi.fn(),
  people: vi.fn(),
};
const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const selectChainMock = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          findManyMocks[prop] ??= vi.fn();
          findFirstMocks[prop] ??= vi.fn();
          return { findMany: findManyMocks[prop]!, findFirst: findFirstMocks[prop]! };
        },
      },
    ),
    insert: (table: unknown) => {
      insertMock(table);
      return {
        values: (v: unknown) => {
          insertMock(table, v); // capture values for assertions
          return {
            onConflictDoUpdate: (opts: unknown) => {
              insertMock(table, v, opts);
              return { returning: () => [{ id: "new-id" }] };
            },
            returning: () => [{ id: "new-id" }],
          };
        },
      };
    },
    update: (table: unknown) => {
      updateMock(table);
      return {
        set: (s: unknown) => {
          updateMock(table, s);
          return { where: () => undefined };
        }
      };
    },
    delete: (table: unknown) => {
      deleteMock(table);
      return { where: () => undefined };
    },
    select: () => {
      selectChainMock();
      return {
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: async () => [{ orderId: "o1" }] }),
          }),
        }),
      };
    },
  },
}));

import { computeVerified, getReviewTargetConfig, recomputeAggregate } from "./queries";
import { DEFAULT_REVIEW_TARGET_CONFIG } from "./queries";

beforeEach(() => {
  for (const k of Object.keys(findManyMocks)) findManyMocks[k]!.mockReset();
  for (const k of Object.keys(findFirstMocks)) findFirstMocks[k]!.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  selectChainMock.mockReset();
});

describe("getReviewTargetConfig", () => {
  it("returns defaults when no row exists", async () => {
    findFirstMocks.reviewTargets!.mockResolvedValue(undefined);
    const cfg = await getReviewTargetConfig("product");
    expect(cfg).toEqual({ ...DEFAULT_REVIEW_TARGET_CONFIG, targetType: "product" });
  });

  it("returns the DB row when present", async () => {
    findFirstMocks.reviewTargets!.mockResolvedValue({
      targetType: "product",
      enabled: false,
      moderation: "pre",
      verifiedGate: "required",
      requireLogin: true,
      allowRating: false,
      minRating: 0,
      maxRating: 10,
      updatedAt: 123,
    });
    const cfg = await getReviewTargetConfig("product");
    expect(cfg.enabled).toBe(false);
    expect(cfg.moderation).toBe("pre");
    expect(cfg.verifiedGate).toBe("required");
    expect(cfg.allowRating).toBe(false);
  });
});

describe("computeVerified", () => {
  it("returns verified=true with method=order when a paid order has the product", async () => {
    // selectChainMock returns [{ orderId: "o1" }] via the mock chain above
    const result = await computeVerified("person1", "product", "p1");
    expect(result.verified).toBe(true);
    expect(result.method).toBe("order");
    expect(result.ref).toBe("o1");
  });

  it("returns verified=false for non-product targets (reviews are products-only)", async () => {
    // Migration 0034 restricted reviews to products. Non-product targets are
    // no longer reachable via submission, but computeVerified still handles
    // them defensively by returning not-verified.
    const result = await computeVerified("person1", "entry:course", "course1");
    expect(result.verified).toBe(false);
    expect(result.method).toBe("none");
  });
});

describe("recomputeAggregate", () => {
  it("computes average + distribution from approved reviews and upserts", async () => {
    // 5, 5, 4, 3, 0 (comment-only excluded from average, counted in total)
    findManyMocks.reviews!.mockResolvedValue([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
      { rating: 0 },
    ]);

    await recomputeAggregate("product", "p1");

    expect(insertMock).toHaveBeenCalled();
    // calls[0] = [table], calls[1] = [table, values]
    const valuesCall = insertMock.mock.calls.find((c) => c.length > 1 && c[1] && typeof c[1] === "object");
    expect(valuesCall).toBeDefined();
    const values = valuesCall![1] as Record<string, unknown>;
    expect(values.count).toBe(5);
    expect(values.average).toBe(4.3); // (5+5+4+3)/4 = 4.25 → rounded to 4.3
    expect(values.distribution).toEqual([0, 0, 1, 1, 2]);
  });

  it("handles zero approved reviews (average 0, empty distribution)", async () => {
    findManyMocks.reviews!.mockResolvedValue([]);
    await recomputeAggregate("product", "p1");
    const valuesCall = insertMock.mock.calls.find((c) => c.length > 1 && c[1] && typeof c[1] === "object");
    const values = valuesCall![1] as Record<string, unknown>;
    expect(values.average).toBe(0);
    expect(values.count).toBe(0);
    expect(values.distribution).toEqual([0, 0, 0, 0, 0]);
  });
});
