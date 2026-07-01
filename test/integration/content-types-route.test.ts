import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test: GET /api/content-types/[id] used to return a custom content type's full
// field schema to ANY caller regardless of auth, inconsistent with its sibling list route
// (GET /api/content-types), which correctly filters non-admins to isBuiltIn types only.

const getAdminSession = vi.fn();
const getContentTypeById = vi.fn();

vi.mock("@/lib/auth", () => ({ getAdminSession: () => getAdminSession() }));
vi.mock("@/lib/db", () => ({
  getContentTypeById: (id: string) => getContentTypeById(id),
  updateContentType: vi.fn(),
  deleteContentType: vi.fn(),
}));

const BUILT_IN = { id: "type-post", slug: "post", name: "Post", icon: null, fields: "[]", isBuiltIn: 1, sortOrder: 0, seoTitleTemplate: null, seoDescriptionTemplate: null, createdAt: "", updatedAt: "" };
const CUSTOM = { ...BUILT_IN, id: "type-custom", slug: "testimonial", name: "Testimonial", isBuiltIn: 0, fields: JSON.stringify([{ key: "quote", label: "Quote", kind: "text" }]) };

beforeEach(() => {
  getAdminSession.mockReset().mockResolvedValue(false);
  getContentTypeById.mockReset();
});

describe("GET /api/content-types/[id]", () => {
  it("404s a custom content type's schema for an unauthenticated caller", async () => {
    getContentTypeById.mockResolvedValue(CUSTOM);
    const { GET } = await import("@/app/api/content-types/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-types/type-custom") as never, { params: Promise.resolve({ id: "type-custom" }) });
    expect(res.status).toBe(404);
  });

  it("returns a built-in content type's schema for an unauthenticated caller", async () => {
    getContentTypeById.mockResolvedValue(BUILT_IN);
    const { GET } = await import("@/app/api/content-types/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-types/type-post") as never, { params: Promise.resolve({ id: "type-post" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe("post");
  });

  it("returns a custom content type's full schema for an admin caller", async () => {
    getAdminSession.mockResolvedValue(true);
    getContentTypeById.mockResolvedValue(CUSTOM);
    const { GET } = await import("@/app/api/content-types/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-types/type-custom") as never, { params: Promise.resolve({ id: "type-custom" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe("testimonial");
  });

  it("404s a genuinely missing id the same way regardless of auth", async () => {
    getContentTypeById.mockResolvedValue(undefined);
    const { GET } = await import("@/app/api/content-types/[id]/route");
    const res = await GET(new Request("http://localhost/api/content-types/missing") as never, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
