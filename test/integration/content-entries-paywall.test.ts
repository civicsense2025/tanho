import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test for an unauthenticated paywall bypass: GET /api/content-entries and
// GET /api/content-entries/[id] used to return a paid post's full body (data.body) to anyone,
// with no visibility/entitlement check at all -- unlike src/app/posts/[slug]/page.tsx, which
// gates the body correctly. redactPaidEntry() closes this for both routes.

const getAdminSession = vi.fn();
const listContentEntries = vi.fn();
const listContentTypes = vi.fn();
const getContentTypeBySlug = vi.fn();
const getContentEntryById = vi.fn();
const getContentTypeById = vi.fn();
const verifyPostAccess = vi.fn();
const cookieGet = vi.fn();

vi.mock("@/lib/auth", () => ({ getAdminSession: () => getAdminSession() }));
vi.mock("@/lib/db", () => ({
  listContentEntries: (f: unknown) => listContentEntries(f),
  listContentTypes: () => listContentTypes(),
  getContentTypeBySlug: (s: string) => getContentTypeBySlug(s),
  getContentEntryById: (id: string) => getContentEntryById(id),
  getContentTypeById: (id: string) => getContentTypeById(id),
  createContentEntry: vi.fn(),
}));
vi.mock("@/lib/stripe/entitlement", () => ({
  verifyPostAccess: (t: string | undefined) => verifyPostAccess(t),
  ACCESS_COOKIE_NAME: "post_access",
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));

const POST_TYPE = { id: "type-post", slug: "post", name: "Post", fields: "[]", isBuiltIn: 1, sortOrder: 0, createdAt: "", updatedAt: "" };

function paidEntry(overrides: Partial<{ status: string; visibility: string }> = {}) {
  return {
    id: "entry-1",
    contentTypeId: "type-post",
    slug: "paid-post",
    title: "A Paid Post",
    status: overrides.status ?? "published",
    scheduledAt: null,
    sortOrder: 0,
    seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
    data: JSON.stringify({ visibility: overrides.visibility ?? "paid", excerpt: "teaser", body: "<p>the full paid body</p>" }),
    createdAt: "", updatedAt: "",
  };
}

beforeEach(() => {
  getAdminSession.mockReset().mockResolvedValue(false);
  listContentEntries.mockReset();
  listContentTypes.mockReset().mockResolvedValue([POST_TYPE]);
  getContentTypeBySlug.mockReset().mockResolvedValue(POST_TYPE);
  getContentEntryById.mockReset();
  getContentTypeById.mockReset().mockResolvedValue(POST_TYPE);
  verifyPostAccess.mockReset().mockResolvedValue(false);
  cookieGet.mockReset().mockReturnValue(undefined);
});

describe("GET /api/content-entries (list) -- paid post redaction", () => {
  it("strips data.body from a paid post for an unauthenticated, non-entitled caller", async () => {
    listContentEntries.mockResolvedValue([paidEntry()]);
    const { GET } = await import("@/app/api/content-entries/route");
    const res = await GET(new Request("http://localhost/api/content-entries?type=post") as never);
    const [entry] = await res.json();
    const data = JSON.parse(entry.data);
    expect(data.body).toBeUndefined();
    expect(data.excerpt).toBe("teaser"); // non-body fields still shown, matching the page's excerpt behavior
  });

  it("does NOT redact when the caller has a valid, still-active entitlement token", async () => {
    listContentEntries.mockResolvedValue([paidEntry()]);
    verifyPostAccess.mockResolvedValue(true);
    cookieGet.mockReturnValue({ value: "valid-token" });
    const { GET } = await import("@/app/api/content-entries/route");
    const res = await GET(new Request("http://localhost/api/content-entries?type=post") as never);
    const [entry] = await res.json();
    expect(JSON.parse(entry.data).body).toBe("<p>the full paid body</p>");
  });

  it("does NOT redact a public (non-paid) post", async () => {
    listContentEntries.mockResolvedValue([paidEntry({ visibility: "public" })]);
    const { GET } = await import("@/app/api/content-entries/route");
    const res = await GET(new Request("http://localhost/api/content-entries?type=post") as never);
    const [entry] = await res.json();
    expect(JSON.parse(entry.data).body).toBe("<p>the full paid body</p>");
  });

  it("skips redaction entirely for an admin caller", async () => {
    getAdminSession.mockResolvedValue(true);
    listContentEntries.mockResolvedValue([paidEntry()]);
    const { GET } = await import("@/app/api/content-entries/route");
    const res = await GET(new Request("http://localhost/api/content-entries?type=post") as never);
    const [entry] = await res.json();
    expect(JSON.parse(entry.data).body).toBe("<p>the full paid body</p>");
  });

  it("does not redact a non-post content type even if it has a coincidental visibility:paid field", async () => {
    const guideType = { ...POST_TYPE, id: "type-guide", slug: "guide" };
    listContentTypes.mockResolvedValue([guideType]);
    listContentEntries.mockResolvedValue([{ ...paidEntry(), contentTypeId: "type-guide" }]);
    const { GET } = await import("@/app/api/content-entries/route");
    const res = await GET(new Request("http://localhost/api/content-entries") as never);
    const [entry] = await res.json();
    expect(JSON.parse(entry.data).body).toBe("<p>the full paid body</p>");
  });
});

describe("GET /api/content-entries/[id] -- paid post redaction", () => {
  it("strips data.body from a paid post for an unauthenticated, non-entitled caller", async () => {
    getContentEntryById.mockResolvedValue(paidEntry());
    const { GET } = await import("@/app/api/content-entries/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-entries/entry-1") as never, { params: Promise.resolve({ id: "entry-1" }) });
    const entry = await res.json();
    expect(JSON.parse(entry.data).body).toBeUndefined();
  });

  it("does NOT redact when the caller has a valid, still-active entitlement token", async () => {
    getContentEntryById.mockResolvedValue(paidEntry());
    verifyPostAccess.mockResolvedValue(true);
    cookieGet.mockReturnValue({ value: "valid-token" });
    const { GET } = await import("@/app/api/content-entries/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-entries/entry-1") as never, { params: Promise.resolve({ id: "entry-1" }) });
    const entry = await res.json();
    expect(JSON.parse(entry.data).body).toBe("<p>the full paid body</p>");
  });

  it("skips redaction entirely for an admin caller", async () => {
    getAdminSession.mockResolvedValue(true);
    getContentEntryById.mockResolvedValue(paidEntry());
    const { GET } = await import("@/app/api/content-entries/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-entries/entry-1") as never, { params: Promise.resolve({ id: "entry-1" }) });
    const entry = await res.json();
    expect(JSON.parse(entry.data).body).toBe("<p>the full paid body</p>");
  });

  it("still 404s a draft entry for a non-admin regardless of visibility", async () => {
    getContentEntryById.mockResolvedValue(paidEntry({ status: "draft" }));
    const { GET } = await import("@/app/api/content-entries/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-entries/entry-1") as never, { params: Promise.resolve({ id: "entry-1" }) });
    expect(res.status).toBe(404);
  });
});
