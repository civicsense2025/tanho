import { describe, it, expect, vi, beforeEach } from "vitest";

// The paid-post unlock flow proves email ownership before granting access:
//  - POST /api/unlock emails a magic link to an ACTIVE subscriber (never sets a cookie, never
//    reveals membership).
//  - GET /api/unlock/confirm verifies the emailed token + re-checks the live subscription, then
//    sets the httpOnly post_access cookie.
// This locks the fix for the "mint cookie from plaintext email" (ownership) and "token in URL"
// findings.

const getSettings = vi.fn();
const getActiveSubscriptionByEmail = vi.fn();
const sendTransactional = vi.fn();
const cookieSet = vi.fn();

vi.mock("@/lib/settings", () => ({ getSettings: () => getSettings() }));
vi.mock("@/lib/db", () => ({ getActiveSubscriptionByEmail: (e: string) => getActiveSubscriptionByEmail(e) }));
vi.mock("@/lib/email/provider", () => ({ getEmailProvider: () => ({ sendTransactional }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));

const { POST } = await import("@/app/api/unlock/route");
const { GET } = await import("@/app/api/unlock/confirm/route");
const { signSubscriberToken } = await import("@/lib/stripe/entitlement");

function postReq(body: unknown) {
  return new Request("http://localhost/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function confirmReq(token: string) {
  const { NextRequest } = require("next/server");
  return new NextRequest(`http://localhost/api/unlock/confirm?token=${token}`);
}

beforeEach(() => {
  process.env.ENTITLEMENT_SECRET = "test-entitlement-secret-at-least-32-characters";
  getSettings.mockResolvedValue({ features: { newsletter: true }, siteName: "Site", url: "http://localhost" });
  getActiveSubscriptionByEmail.mockReset();
  sendTransactional.mockReset().mockResolvedValue({ messageId: "m1" });
  cookieSet.mockReset();
});

describe("POST /api/unlock (request magic link)", () => {
  it("404s when newsletter is disabled", async () => {
    getSettings.mockResolvedValue({ features: { newsletter: false } });
    expect((await POST(postReq({ email: "a@example.com" }))).status).toBe(404);
  });

  it("400s on an invalid email (Zod-narrowed before any DB use)", async () => {
    const res = await POST(postReq({ email: "nope" }));
    expect(res.status).toBe(400);
    expect(getActiveSubscriptionByEmail).not.toHaveBeenCalled();
  });

  it("emails a magic link for an ACTIVE subscriber and NEVER sets a cookie", async () => {
    getActiveSubscriptionByEmail.mockResolvedValue({ id: "s1", status: "active" });
    const res = await POST(postReq({ email: "sub@example.com" }));
    expect(res.status).toBe(200);
    expect(sendTransactional).toHaveBeenCalledOnce();
    // The link contains a token, not a cookie; the POST sets no cookie.
    expect(sendTransactional.mock.calls[0][2]).toMatch(/\/api\/unlock\/confirm\?token=/);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("enumeration-safe: identical 200, no email, no cookie when no active subscription", async () => {
    getActiveSubscriptionByEmail.mockResolvedValue(undefined);
    const res = await POST(postReq({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    expect(sendTransactional).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });
});

describe("GET /api/unlock/confirm (redeem)", () => {
  it("sets the post_access cookie for a valid token + still-active subscription", async () => {
    getActiveSubscriptionByEmail.mockResolvedValue({ id: "s1", status: "active" });
    const token = await signSubscriberToken("sub@example.com", "15m");
    const res = await GET(confirmReq(token));
    expect(res.status).toBe(303);
    expect(cookieSet).toHaveBeenCalledWith(
      "post_access",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
  });

  it("rejects a garbage token — no cookie", async () => {
    const res = await GET(confirmReq("not-a-token"));
    expect(res.status).toBe(400);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("rejects a valid token whose subscription is no longer active", async () => {
    getActiveSubscriptionByEmail.mockResolvedValue(undefined); // canceled since the email was sent
    const token = await signSubscriberToken("sub@example.com", "15m");
    const res = await GET(confirmReq(token));
    expect(res.status).toBe(400);
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
