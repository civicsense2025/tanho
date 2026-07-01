import { describe, it, expect, vi, beforeEach } from "vitest";

// The cron route's entire protection is its own CRON_SECRET bearer check (deliberately outside
// proxy.ts's session-based admin gate, since a machine caller has no cookie -- see
// proxy-allowlist.test.ts for the assertion it stays off both of proxy.ts's twin lists).

const publishDueScheduledContent = vi.fn();
vi.mock("@/lib/scheduling", () => ({ publishDueScheduledContent: () => publishDueScheduledContent() }));

function req(authHeader?: string) {
  return new Request("http://localhost/api/cron/publish-scheduled", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  publishDueScheduledContent.mockReset().mockResolvedValue([{ id: "e1" }, { id: "e2" }]);
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("GET /api/cron/publish-scheduled", () => {
  it("401s with no Authorization header", async () => {
    const { GET } = await import("@/app/api/cron/publish-scheduled/route");
    const res = await GET(req() as never);
    expect(res.status).toBe(401);
    expect(publishDueScheduledContent).not.toHaveBeenCalled();
  });

  it("401s with the wrong bearer token", async () => {
    const { GET } = await import("@/app/api/cron/publish-scheduled/route");
    const res = await GET(req("Bearer wrong-secret") as never);
    expect(res.status).toBe(401);
    expect(publishDueScheduledContent).not.toHaveBeenCalled();
  });

  it("succeeds with the correct bearer token and reports what was published", async () => {
    const { GET } = await import("@/app/api/cron/publish-scheduled/route");
    const res = await GET(req("Bearer test-cron-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ published: 2, ids: ["e1", "e2"] });
    expect(publishDueScheduledContent).toHaveBeenCalledTimes(1);
  });
});
