import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression guard for the paywall/authorization bypass on GET /api/posts/[id]/content:
// the raw-body API must enforce the same gate as the public page — a non-admin may read only a
// published PUBLIC post's body; drafts and PAID posts are withheld (404), even when published.

const getAdminSession = vi.fn();
const getPostById = vi.fn();
const getPostBody = vi.fn(async (_slug: string) => "SECRET BODY");

vi.mock("@/lib/auth", () => ({ getAdminSession: () => getAdminSession() }));
vi.mock("@/lib/db", () => ({ getPostById: (id: string) => getPostById(id) }));
vi.mock("@/lib/content/post-content", () => ({
  getPostBody: (slug: string) => getPostBody(slug),
  savePostBody: vi.fn(),
}));

const { GET } = await import("@/app/api/posts/[id]/content/route");

function req() {
  return new Request("http://localhost/api/posts/p1/content");
}
const params = { params: Promise.resolve({ id: "p1" }) };

function post(over: Record<string, unknown> = {}) {
  return { id: "p1", slug: "s", status: "published", visibility: "public", ...over };
}

beforeEach(() => {
  getAdminSession.mockReset();
  getPostById.mockReset();
  getPostBody.mockClear();
});

describe("GET /api/posts/[id]/content authorization", () => {
  it("serves a published public post body to anonymous readers", async () => {
    getAdminSession.mockResolvedValue(false);
    getPostById.mockResolvedValue(post());
    const res = await GET(req() as never, params as never);
    expect(res.status).toBe(200);
    expect((await res.json()).body).toBe("SECRET BODY");
  });

  it("withholds a PAID (published) post body from anonymous readers", async () => {
    getAdminSession.mockResolvedValue(false);
    getPostById.mockResolvedValue(post({ visibility: "paid" }));
    const res = await GET(req() as never, params as never);
    expect(res.status).toBe(404);
    expect(getPostBody).not.toHaveBeenCalled();
  });

  it("withholds a DRAFT post body from anonymous readers", async () => {
    getAdminSession.mockResolvedValue(false);
    getPostById.mockResolvedValue(post({ status: "draft" }));
    const res = await GET(req() as never, params as never);
    expect(res.status).toBe(404);
  });

  it("serves paid/draft bodies to an authenticated admin", async () => {
    getAdminSession.mockResolvedValue(true);
    getPostById.mockResolvedValue(post({ status: "draft", visibility: "paid" }));
    const res = await GET(req() as never, params as never);
    expect(res.status).toBe(200);
    expect((await res.json()).body).toBe("SECRET BODY");
  });
});
