import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression coverage for the entry-to-collection assignment wiring added to the
// content-entries POST/PATCH routes: an OMITTED collectionIds must leave existing assignments
// untouched (so a caller unaware of collections can't accidentally wipe them on every save),
// while an EXPLICIT empty array must actually clear them -- Array.isArray() is what
// distinguishes the two, not a truthiness check (which would treat [] the same as omitted).

const getAdminSession = vi.fn();
const createContentEntry = vi.fn();
const updateContentEntry = vi.fn();
const getContentEntryById = vi.fn();
const getContentTypeBySlug = vi.fn();
const getContentTypeById = vi.fn();
const setContentEntryCollections = vi.fn();
const revalidateContent = vi.fn();

const POST_TYPE = { id: "type-post", slug: "post", name: "Post", fields: "[]", isBuiltIn: 1, sortOrder: 0, seoTitleTemplate: null, seoDescriptionTemplate: null, createdAt: "", updatedAt: "" };
const EXISTING_ENTRY = {
  id: "entry-1", contentTypeId: "type-post", slug: "x", title: "X", status: "draft",
  scheduledAt: null, publishedAt: null, sortOrder: 0,
  seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
  data: "{}", createdAt: "", updatedAt: "",
};

vi.mock("@/lib/auth", () => ({ getAdminSession: () => getAdminSession() }));
vi.mock("@/lib/db", () => ({
  createContentEntry: (d: unknown) => createContentEntry(d),
  updateContentEntry: (id: string, d: unknown) => updateContentEntry(id, d),
  getContentEntryById: (id: string) => getContentEntryById(id),
  getContentTypeBySlug: (s: string) => getContentTypeBySlug(s),
  getContentTypeById: (id: string) => getContentTypeById(id),
  listContentTypes: () => Promise.resolve([POST_TYPE]),
  setContentEntryCollections: (id: string, c: unknown) => setContentEntryCollections(id, c),
}));
vi.mock("@/lib/cache", () => ({ revalidateContent: (slug: string) => revalidateContent(slug) }));
vi.mock("@/lib/content-types", () => ({ parseEntryData: (_fields: unknown, data: unknown) => ({ data }) }));
vi.mock("@/lib/content-types/paywall", () => ({ redactPaidEntry: (e: unknown) => Promise.resolve(e) }));

function jsonReq(url: string, body: unknown, method = "POST") {
  return new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  getAdminSession.mockReset().mockResolvedValue(true);
  createContentEntry.mockReset().mockResolvedValue({ ...EXISTING_ENTRY, id: "new-entry" });
  updateContentEntry.mockReset().mockResolvedValue(EXISTING_ENTRY);
  getContentEntryById.mockReset().mockResolvedValue(EXISTING_ENTRY);
  getContentTypeBySlug.mockReset().mockResolvedValue(POST_TYPE);
  getContentTypeById.mockReset().mockResolvedValue(POST_TYPE);
  setContentEntryCollections.mockReset().mockResolvedValue(undefined);
  revalidateContent.mockReset();
});

describe("POST /api/content-entries — collection assignment", () => {
  it("assigns collections with positional sortOrder when collectionIds is provided", async () => {
    const { POST } = await import("@/app/api/content-entries/route");
    await POST(jsonReq("http://localhost/api/content-entries", { typeSlug: "post", title: "New", collectionIds: ["c2", "c1"] }) as never);
    expect(setContentEntryCollections).toHaveBeenCalledWith("new-entry", [
      { collectionId: "c2", sortOrder: 0 },
      { collectionId: "c1", sortOrder: 1 },
    ]);
  });

  it("never calls setContentEntryCollections when collectionIds is omitted", async () => {
    const { POST } = await import("@/app/api/content-entries/route");
    await POST(jsonReq("http://localhost/api/content-entries", { typeSlug: "post", title: "New" }) as never);
    expect(setContentEntryCollections).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/content-entries/[id] — collection assignment", () => {
  it("assigns collections when collectionIds is provided", async () => {
    const { PATCH } = await import("@/app/api/content-entries/[id]/route");
    await PATCH(jsonReq("http://localhost/api/content-entries/entry-1", { collectionIds: ["c1"] }, "PATCH") as never, { params: Promise.resolve({ id: "entry-1" }) });
    expect(setContentEntryCollections).toHaveBeenCalledWith("entry-1", [{ collectionId: "c1", sortOrder: 0 }]);
  });

  it("leaves existing assignments untouched when collectionIds is omitted from an otherwise-valid update", async () => {
    const { PATCH } = await import("@/app/api/content-entries/[id]/route");
    await PATCH(jsonReq("http://localhost/api/content-entries/entry-1", { title: "Renamed" }, "PATCH") as never, { params: Promise.resolve({ id: "entry-1" }) });
    expect(setContentEntryCollections).not.toHaveBeenCalled();
  });

  it("clears all assignments when collectionIds is explicitly an empty array (distinct from omitted)", async () => {
    const { PATCH } = await import("@/app/api/content-entries/[id]/route");
    await PATCH(jsonReq("http://localhost/api/content-entries/entry-1", { collectionIds: [] }, "PATCH") as never, { params: Promise.resolve({ id: "entry-1" }) });
    expect(setContentEntryCollections).toHaveBeenCalledWith("entry-1", []);
  });
});
