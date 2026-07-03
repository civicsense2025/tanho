import { describe, expect, it } from "vitest";
import { nullPayments } from "./null";

describe("null payments adapter", () => {
  it("reports itself unconfigured", () => {
    expect(nullPayments.isConfigured()).toBe(false);
  });

  it("refuses checkout with a clear error", async () => {
    await expect(
      nullPayments.createCheckoutSession({
        mode: "payment",
        lineItems: [],
        successUrl: "/ok",
        cancelUrl: "/no",
      }),
    ).rejects.toThrow(/not configured/i);
  });

  it("refuses webhook verification", async () => {
    await expect(nullPayments.constructWebhookEvent("{}", "sig")).rejects.toThrow(
      /not configured/i,
    );
  });
});
