import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// Stripe webhook verification + idempotency, tested against a REAL signature (Stripe's own
// test-header generator) and a mocked DB layer. Covers the security-critical invariants: bad
// signature rejected, valid event handled, and a re-delivered checkout.session.completed is a
// no-op (idempotent).

const WEBHOOK_SECRET = "whsec_test_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

// DB mocks — capture calls so we can assert idempotency.
const getOrderByCheckoutSession = vi.fn();
const updateOrder = vi.fn();
const createOrder = vi.fn();

vi.mock("@/lib/db", () => ({
  getOrderByCheckoutSession: (s: string) => getOrderByCheckoutSession(s),
  updateOrder: (id: string, p: unknown) => updateOrder(id, p),
  createOrder: (d: unknown) => createOrder(d),
  getSubscriptionByStripeId: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
}));

const stripe = new Stripe("sk_test_dummy");

function signed(payload: object): { body: string; sig: string } {
  const body = JSON.stringify(payload);
  const sig = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
  return { body, sig };
}

function checkoutCompletedEvent(sessionId: string) {
  return {
    id: `evt_${sessionId}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        metadata: { kind: "one_time", postId: "post-1" },
        customer_details: { email: "buyer@example.com" },
        customer_email: "buyer@example.com",
        payment_intent: "pi_123",
        customer: "cus_123",
        amount_total: 500,
        currency: "usd",
      },
    },
  };
}

beforeEach(() => {
  getOrderByCheckoutSession.mockReset();
  updateOrder.mockReset();
  createOrder.mockReset();
});

describe("stripe webhook", () => {
  it("rejects a tampered/invalid signature", async () => {
    const { verifyEvent } = await import("@/lib/stripe/webhook");
    const { body } = signed(checkoutCompletedEvent("cs_1"));
    expect(() => verifyEvent(body, "t=1,v1=deadbeef")).toThrow();
    expect(() => verifyEvent(body, null)).toThrow(/Missing stripe-signature/);
  });

  it("verifies a correctly-signed event", async () => {
    const { verifyEvent } = await import("@/lib/stripe/webhook");
    const { body, sig } = signed(checkoutCompletedEvent("cs_2"));
    const event = verifyEvent(body, sig);
    expect(event.type).toBe("checkout.session.completed");
  });

  it("marks a pending order paid on checkout.session.completed", async () => {
    const { handleEvent } = await import("@/lib/stripe/webhook");
    getOrderByCheckoutSession.mockResolvedValue({ id: "order-1", status: "pending" });
    await handleEvent(checkoutCompletedEvent("cs_3") as unknown as Stripe.Event);
    expect(updateOrder).toHaveBeenCalledWith("order-1", expect.objectContaining({ status: "paid" }));
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("is idempotent: a re-delivered event for an already-paid order does nothing", async () => {
    const { handleEvent } = await import("@/lib/stripe/webhook");
    getOrderByCheckoutSession.mockResolvedValue({ id: "order-1", status: "paid" });
    await handleEvent(checkoutCompletedEvent("cs_3") as unknown as Stripe.Event);
    expect(updateOrder).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("creates a paid order when none pre-exists (e.g. Payment Link)", async () => {
    const { handleEvent } = await import("@/lib/stripe/webhook");
    getOrderByCheckoutSession.mockResolvedValue(undefined);
    await handleEvent(checkoutCompletedEvent("cs_4") as unknown as Stripe.Event);
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ status: "paid", postId: "post-1" }));
  });
});
