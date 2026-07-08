import { describe, expect, it } from "vitest";
import { productSchema } from "./validation";

const validBase = {
  name: "Test product",
  slug: "test-product",
  priceCents: 1000,
};

describe("productSchema — typed-product axes", () => {
  it("defaults kind to physical, billingModel to one-time", () => {
    const res = productSchema.safeParse(validBase);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.kind).toBe("physical");
      expect(res.data.billingModel).toBe("one-time");
      expect(res.data.taxBehavior).toBe("exclusive");
      expect(res.data.fulfillmentMode).toBe("ship");
      expect(res.data.fulfillmentProvider).toBe("local");
    }
  });

  it("accepts each kind with its default fulfillment mode", () => {
    for (const [kind, mode] of [
      ["physical", "ship"],
      ["digital", "download"],
      ["service", "booking"],
      ["course", "access_grant"],
    ] as const) {
      const res = productSchema.safeParse({ ...validBase, kind, fulfillmentMode: mode });
      expect(res.success).toBe(true);
    }
  });
});

describe("productSchema — recurring requires membership tier", () => {
  it("rejects recurring billing without membershipTier", () => {
    const res = productSchema.safeParse({
      ...validBase,
      billingModel: "recurring",
      membershipTier: null,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("membershipTier"))).toBe(true);
    }
  });

  it("accepts recurring billing with a membershipTier", () => {
    const res = productSchema.safeParse({
      ...validBase,
      billingModel: "recurring",
      membershipTier: "premium",
    });
    expect(res.success).toBe(true);
  });

  it("accepts one-time billing without membershipTier", () => {
    const res = productSchema.safeParse({
      ...validBase,
      billingModel: "one-time",
      membershipTier: null,
    });
    expect(res.success).toBe(true);
  });
});

describe("productSchema — kind→fulfillmentMode contract", () => {
  it("rejects physical with download fulfillment", () => {
    const res = productSchema.safeParse({ ...validBase, kind: "physical", fulfillmentMode: "download" });
    expect(res.success).toBe(false);
  });

  it("rejects digital with ship fulfillment", () => {
    const res = productSchema.safeParse({ ...validBase, kind: "digital", fulfillmentMode: "ship" });
    expect(res.success).toBe(false);
  });

  it("rejects service with ship fulfillment", () => {
    const res = productSchema.safeParse({ ...validBase, kind: "service", fulfillmentMode: "ship" });
    expect(res.success).toBe(false);
  });

  it("rejects course with ship fulfillment", () => {
    const res = productSchema.safeParse({ ...validBase, kind: "course", fulfillmentMode: "ship" });
    expect(res.success).toBe(false);
  });

  it("accepts physical with pod fulfillment", () => {
    const res = productSchema.safeParse({ ...validBase, kind: "physical", fulfillmentMode: "pod" });
    expect(res.success).toBe(true);
  });

  it("accepts course with download fulfillment", () => {
    const res = productSchema.safeParse({ ...validBase, kind: "course", fulfillmentMode: "download" });
    expect(res.success).toBe(true);
  });
});
