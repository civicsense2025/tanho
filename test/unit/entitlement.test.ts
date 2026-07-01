import { describe, it, expect, vi, beforeEach } from "vitest";

// Entitlement is subscription-only: a reader token proves email ownership, and access is
// re-checked live against the subscription. The reader token uses a DISTINCT audience from the
// admin token, so it can never be confused for an admin session.

const getActiveSubscriptionByEmail = vi.fn();
vi.mock("@/lib/db", () => ({
  getActiveSubscriptionByEmail: (e: string) => getActiveSubscriptionByEmail(e),
}));

beforeEach(() => {
  process.env.ENTITLEMENT_SECRET = "test-entitlement-secret-at-least-32-characters";
  process.env.ADMIN_SECRET = "a-totally-different-admin-secret-value-here!!";
  getActiveSubscriptionByEmail.mockReset();
});

describe("subscriber tokens", () => {
  it("round-trips a subscriber token", async () => {
    const { signSubscriberToken, verifySubscriberToken } = await import("@/lib/stripe/entitlement");
    const token = await signSubscriberToken("reader@example.com");
    expect(await verifySubscriberToken(token)).toBe("reader@example.com");
  });

  it("rejects an admin-audience (no reader audience) token — cross-use prevented", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.ENTITLEMENT_SECRET);
    const adminish = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);
    const { verifySubscriberToken } = await import("@/lib/stripe/entitlement");
    expect(await verifySubscriberToken(adminish)).toBeNull();
  });

  it("rejects a garbage token", async () => {
    const { verifySubscriberToken } = await import("@/lib/stripe/entitlement");
    expect(await verifySubscriberToken("not.a.token")).toBeNull();
  });
});

describe("verifyPostAccess (subscription-only, live re-check)", () => {
  it("grants access when the token is valid AND the subscription is still active", async () => {
    const { signSubscriberToken, verifyPostAccess } = await import("@/lib/stripe/entitlement");
    getActiveSubscriptionByEmail.mockResolvedValue({ id: "sub-1", status: "active" });
    const token = await signSubscriberToken("reader@example.com");
    expect(await verifyPostAccess(token)).toBe(true);
    expect(getActiveSubscriptionByEmail).toHaveBeenCalledWith("reader@example.com");
  });

  it("DENIES access when the subscription is no longer active, even with a valid token", async () => {
    const { signSubscriberToken, verifyPostAccess } = await import("@/lib/stripe/entitlement");
    getActiveSubscriptionByEmail.mockResolvedValue(undefined); // canceled → no active sub
    const token = await signSubscriberToken("reader@example.com");
    expect(await verifyPostAccess(token)).toBe(false);
  });

  it("denies access with no token or a bad token", async () => {
    const { verifyPostAccess } = await import("@/lib/stripe/entitlement");
    expect(await verifyPostAccess(undefined)).toBe(false);
    expect(await verifyPostAccess("garbage")).toBe(false);
    expect(getActiveSubscriptionByEmail).not.toHaveBeenCalled();
  });
});
