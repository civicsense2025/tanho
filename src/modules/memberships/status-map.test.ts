import { describe, expect, it } from "vitest";
import { stripeStatusToMembership } from "./status-map";

describe("stripeStatusToMembership", () => {
  it("maps active and trialing to active", () => {
    expect(stripeStatusToMembership("active")).toBe("active");
    expect(stripeStatusToMembership("trialing")).toBe("active");
  });

  it("maps past_due, unpaid and incomplete to past_due", () => {
    expect(stripeStatusToMembership("past_due")).toBe("past_due");
    expect(stripeStatusToMembership("unpaid")).toBe("past_due");
    expect(stripeStatusToMembership("incomplete")).toBe("past_due");
  });

  it("maps canceled and incomplete_expired to canceled", () => {
    expect(stripeStatusToMembership("canceled")).toBe("canceled");
    expect(stripeStatusToMembership("incomplete_expired")).toBe("canceled");
  });

  it("falls back to canceled for unknown or empty statuses", () => {
    expect(stripeStatusToMembership("")).toBe("canceled");
    expect(stripeStatusToMembership("paused")).toBe("canceled");
    expect(stripeStatusToMembership("something_new")).toBe("canceled");
  });
});
