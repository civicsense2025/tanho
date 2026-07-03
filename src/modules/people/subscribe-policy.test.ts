import { describe, expect, it } from "vitest";
import { subscribeKind } from "./subscribe-policy";

describe("subscribeKind — newsletter signup never downgrades", () => {
  it("makes a brand-new contact a subscriber", () => {
    expect(subscribeKind(null)).toBe("subscriber");
  });

  it("keeps an existing member a member (no downgrade)", () => {
    expect(subscribeKind("member")).toBe("member");
  });

  it("keeps an existing lead a lead", () => {
    expect(subscribeKind("lead")).toBe("lead");
  });

  it("keeps an existing subscriber a subscriber", () => {
    expect(subscribeKind("subscriber")).toBe("subscriber");
  });
});
