import { describe, it, expect, vi, beforeEach } from "vitest";

// The /api/unlock route mints a paid-post access cookie ONLY for an active subscriber, and is
// enumeration-safe (identical response whether or not the email has a subscription). This locks
// the reconnected paid-post entitlement so the content-type cutover can't silently disconnect it
// again.

const getSettings = vi.fn();
const getActiveSubscriptionByEmail = vi.fn();
const cookieSet = vi.fn();

vi.mock("@/lib/settings", () => ({ getSettings: () => getSettings() }));
vi.mock("@/lib/db", () => ({ getActiveSubscriptionByEmail: (e: string) => getActiveSubscriptionByEmail(e) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));

const { POST } = await import("@/app/api/unlock/route");

function req(body: unknown) {
  return new Request("http://localhost/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getSettings.mockResolvedValue({ features: { newsletter: true } });
  getActiveSubscriptionByEmail.mockReset();
  cookieSet.mockReset();
});

describe("POST /api/unlock", () => {
  it("404s when newsletter is disabled", async () => {
    getSettings.mockResolvedValue({ features: { newsletter: false } });
    const res = await POST(req({ email: "a@example.com" }));
    expect(res.status).toBe(404);
  });

  it("400s on an invalid email (Zod-narrowed before any DB use)", async () => {
    const res = await POST(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(getActiveSubscriptionByEmail).not.toHaveBeenCalled();
  });

  it("sets the post_access cookie for an ACTIVE subscriber", async () => {
    getActiveSubscriptionByEmail.mockResolvedValue({ id: "sub-1", status: "active" });
    const res = await POST(req({ email: "sub@example.com" }));
    expect(res.status).toBe(200);
    expect(cookieSet).toHaveBeenCalledWith(
      "post_access",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
  });

  it("is enumeration-safe: same 200 with NO cookie when there's no active subscription", async () => {
    getActiveSubscriptionByEmail.mockResolvedValue(undefined);
    const res = await POST(req({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
