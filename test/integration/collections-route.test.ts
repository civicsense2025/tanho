import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression coverage for /api/collections: proxy.ts's twin allowlist gates this route (see
// proxy-allowlist.test.ts), but that's defense-in-depth on top of this codebase's actual house
// style -- every write handler has its own inline getAdminSession() check. This asserts those
// inline checks genuinely work, the same way content-types-route.test.ts already does for its
// sibling resource.

const getAdminSession = vi.fn();
const listCollections = vi.fn();
const createCollection = vi.fn();
const getCollectionById = vi.fn();
const updateCollection = vi.fn();
const deleteCollection = vi.fn();

vi.mock("@/lib/auth", () => ({ getAdminSession: () => getAdminSession() }));
vi.mock("@/lib/db", () => ({
  listCollections: () => listCollections(),
  createCollection: (d: unknown) => createCollection(d),
  getCollectionById: (id: string) => getCollectionById(id),
  updateCollection: (id: string, d: unknown) => updateCollection(id, d),
  deleteCollection: (id: string) => deleteCollection(id),
}));

const COLLECTION = { id: "coll-1", slug: "featured", name: "Featured", description: null, sortOrder: 0, createdAt: "", updatedAt: "" };

function jsonReq(body: unknown, method = "POST") {
  return new Request("http://localhost/api/collections", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  getAdminSession.mockReset().mockResolvedValue(false);
  listCollections.mockReset().mockResolvedValue([COLLECTION]);
  createCollection.mockReset().mockResolvedValue(COLLECTION);
  getCollectionById.mockReset().mockResolvedValue(COLLECTION);
  updateCollection.mockReset().mockResolvedValue({ ...COLLECTION, name: "Updated" });
  deleteCollection.mockReset().mockResolvedValue(undefined);
});

describe("GET /api/collections", () => {
  it("is public — no auth required to list collections", async () => {
    const { GET } = await import("@/app/api/collections/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([COLLECTION]);
  });
});

describe("POST /api/collections", () => {
  it("401s an unauthenticated create attempt and never calls createCollection", async () => {
    const { POST } = await import("@/app/api/collections/route");
    const res = await POST(jsonReq({ name: "New" }) as never);
    expect(res.status).toBe(401);
    expect(createCollection).not.toHaveBeenCalled();
  });

  it("succeeds for an admin, deriving slug from name when omitted", async () => {
    getAdminSession.mockResolvedValue(true);
    const { POST } = await import("@/app/api/collections/route");
    const res = await POST(jsonReq({ name: "Featured Guides" }) as never);
    expect(res.status).toBe(201);
    expect(createCollection).toHaveBeenCalledWith(expect.objectContaining({ name: "Featured Guides", slug: "featured-guides" }));
  });

  it("400s when name is missing, even for an admin", async () => {
    getAdminSession.mockResolvedValue(true);
    const { POST } = await import("@/app/api/collections/route");
    const res = await POST(jsonReq({}) as never);
    expect(res.status).toBe(400);
    expect(createCollection).not.toHaveBeenCalled();
  });
});

describe("GET /api/collections/[id]", () => {
  it("is public — no auth required to read a single collection", async () => {
    const { GET } = await import("@/app/api/collections/[id]/route");
    const res = await GET(new Request("http://localhost/api/collections/coll-1") as never, { params: Promise.resolve({ id: "coll-1" }) });
    expect(res.status).toBe(200);
  });

  it("404s a missing collection", async () => {
    getCollectionById.mockResolvedValue(undefined);
    const { GET } = await import("@/app/api/collections/[id]/route");
    const res = await GET(new Request("http://localhost/api/collections/nope") as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/collections/[id]", () => {
  it("401s an unauthenticated update attempt and never calls updateCollection", async () => {
    const { PATCH } = await import("@/app/api/collections/[id]/route");
    const res = await PATCH(jsonReq({ name: "Updated" }, "PATCH") as never, { params: Promise.resolve({ id: "coll-1" }) });
    expect(res.status).toBe(401);
    expect(updateCollection).not.toHaveBeenCalled();
  });

  it("succeeds for an admin", async () => {
    getAdminSession.mockResolvedValue(true);
    const { PATCH } = await import("@/app/api/collections/[id]/route");
    const res = await PATCH(jsonReq({ name: "Updated" }, "PATCH") as never, { params: Promise.resolve({ id: "coll-1" }) });
    expect(res.status).toBe(200);
    expect(updateCollection).toHaveBeenCalledWith("coll-1", { name: "Updated" });
  });
});

describe("DELETE /api/collections/[id]", () => {
  it("401s an unauthenticated delete attempt and never calls deleteCollection", async () => {
    const { DELETE } = await import("@/app/api/collections/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/collections/coll-1", { method: "DELETE" }) as never, { params: Promise.resolve({ id: "coll-1" }) });
    expect(res.status).toBe(401);
    expect(deleteCollection).not.toHaveBeenCalled();
  });

  it("succeeds for an admin", async () => {
    getAdminSession.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/collections/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/collections/coll-1", { method: "DELETE" }) as never, { params: Promise.resolve({ id: "coll-1" }) });
    expect(res.status).toBe(200);
    expect(deleteCollection).toHaveBeenCalledWith("coll-1");
  });
});
