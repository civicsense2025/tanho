import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the two dependencies requireViewer touches: the viewer resolver and
// next/navigation's redirect (which throws in real Next to halt rendering).
const getViewer = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("./viewer", () => ({
  getViewer: () => getViewer(),
  PERSON_COOKIE: "person_session",
}));
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirect(p) }));
// Pull in the DB client's transitive deps lazily is unnecessary — session.ts
// only imports db types at module scope, which are erased. Import after mocks.
vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("@/modules/auth/schema", () => ({ sessions: {} }));
vi.mock("@/modules/auth/tokens", () => ({
  generateSessionToken: () => "t",
  hashSessionToken: () => "h",
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

describe("requireViewer", () => {
  beforeEach(() => {
    getViewer.mockReset();
    redirect.mockClear();
  });

  it("redirects to /signin when there is no viewer", async () => {
    const { requireViewer } = await import("./session");
    getViewer.mockResolvedValue(null);
    await expect(requireViewer()).rejects.toThrow("REDIRECT:/signin");
    expect(redirect).toHaveBeenCalledWith("/signin");
  });

  it("returns the viewer when signed in", async () => {
    const { requireViewer } = await import("./session");
    const viewer = { personId: "p1", email: "a@b.com", name: "A", memberActive: false, tier: null };
    getViewer.mockResolvedValue(viewer);
    await expect(requireViewer()).resolves.toEqual(viewer);
    expect(redirect).not.toHaveBeenCalled();
  });
});
