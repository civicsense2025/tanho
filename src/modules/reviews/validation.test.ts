import { describe, expect, it } from "vitest";
import {
  reviewImportRowSchema,
  reviewReplySchema,
  reviewSortSchema,
  reviewSubmitSchema,
  reviewTargetConfigSchema,
  reviewUpdateSchema,
  targetTypeSchema,
} from "./validation";

describe("targetTypeSchema", () => {
  it("accepts 'product' (the only allowed target type)", () => {
    expect(targetTypeSchema.safeParse("product").success).toBe(true);
  });

  it("rejects legacy entry:/custom: targets and malformed strings", () => {
    // entry:* and custom:* were removed in migration 0034 — reviews are
    // products-only now (a course review is a review on the course product).
    expect(targetTypeSchema.safeParse("entry:project").success).toBe(false);
    expect(targetTypeSchema.safeParse("custom:courses").success).toBe(false);
    expect(targetTypeSchema.safeParse("products").success).toBe(false);
    expect(targetTypeSchema.safeParse("entry:").success).toBe(false);
    expect(targetTypeSchema.safeParse("custom:").success).toBe(false);
    expect(targetTypeSchema.safeParse("foo:bar:baz").success).toBe(false);
    expect(targetTypeSchema.safeParse("").success).toBe(false);
    expect(targetTypeSchema.safeParse("page").success).toBe(false);
    expect(targetTypeSchema.safeParse("post").success).toBe(false);
  });
});

describe("reviewSubmitSchema", () => {
  it("accepts a valid 5-star review", () => {
    const res = reviewSubmitSchema.safeParse({
      targetType: "product",
      targetId: "p1",
      rating: 5,
      title: "Great",
      body: "Loved it",
      photos: [],
      meta: {},
    });
    expect(res.success).toBe(true);
  });

  it("accepts a comment-only review (rating 0)", () => {
    const res = reviewSubmitSchema.safeParse({
      targetType: "product",
      targetId: "p1",
      rating: 0,
      title: "",
      body: "Thoughts...",
      photos: [],
      meta: {},
    });
    expect(res.success).toBe(true);
  });

  it("rejects rating > 5", () => {
    const res = reviewSubmitSchema.safeParse({
      targetType: "product",
      targetId: "p1",
      rating: 6,
    });
    expect(res.success).toBe(false);
  });

  it("rejects rating < 0", () => {
    const res = reviewSubmitSchema.safeParse({
      targetType: "product",
      targetId: "p1",
      rating: -1,
    });
    expect(res.success).toBe(false);
  });

  it("rejects more than 6 photos", () => {
    const res = reviewSubmitSchema.safeParse({
      targetType: "product",
      targetId: "p1",
      rating: 5,
      photos: Array.from({ length: 7 }, (_, i) => `m${i}`),
    });
    expect(res.success).toBe(false);
  });

  it("rejects title over 120 and body over 5000", () => {
    expect(
      reviewSubmitSchema.safeParse({
        targetType: "product",
        targetId: "p1",
        rating: 5,
        title: "x".repeat(121),
      }).success,
    ).toBe(false);
    expect(
      reviewSubmitSchema.safeParse({
        targetType: "product",
        targetId: "p1",
        rating: 5,
        body: "y".repeat(5001),
      }).success,
    ).toBe(false);
  });
});

describe("reviewUpdateSchema", () => {
  it("accepts a valid update", () => {
    const res = reviewUpdateSchema.safeParse({
      rating: 4,
      title: "Updated",
      body: "Changed my mind",
      photos: [],
      meta: {},
    });
    expect(res.success).toBe(true);
  });

  it("rejects rating out of range", () => {
    expect(reviewUpdateSchema.safeParse({ rating: 7 }).success).toBe(false);
    expect(reviewUpdateSchema.safeParse({ rating: -1 }).success).toBe(false);
  });
});

describe("reviewReplySchema", () => {
  it("accepts a non-empty reply", () => {
    const res = reviewReplySchema.safeParse({ body: "Thanks for the review!" });
    expect(res.success).toBe(true);
  });

  it("rejects an empty reply", () => {
    const res = reviewReplySchema.safeParse({ body: "" });
    expect(res.success).toBe(false);
  });

  it("rejects a reply over 2000 chars", () => {
    const res = reviewReplySchema.safeParse({ body: "x".repeat(2001) });
    expect(res.success).toBe(false);
  });
});

describe("reviewTargetConfigSchema", () => {
  it("accepts a full valid config", () => {
    const res = reviewTargetConfigSchema.safeParse({
      targetType: "product",
      enabled: true,
      moderation: "post",
      verifiedGate: "optional",
      requireLogin: true,
      allowRating: true,
      minRating: 1,
      maxRating: 5,
    });
    expect(res.success).toBe(true);
  });

  it("applies defaults when fields are omitted", () => {
    const res = reviewTargetConfigSchema.safeParse({ targetType: "product" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.moderation).toBe("post");
      expect(res.data.verifiedGate).toBe("optional");
      expect(res.data.requireLogin).toBe(true);
      expect(res.data.allowRating).toBe(true);
    }
  });

  it("rejects invalid moderation enum", () => {
    const res = reviewTargetConfigSchema.safeParse({
      targetType: "product",
      moderation: "always",
    });
    expect(res.success).toBe(false);
  });
});

describe("reviewSortSchema", () => {
  it("accepts the four sort options", () => {
    for (const s of ["recent", "helpful", "highest", "lowest"]) {
      expect(reviewSortSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects unknown sort", () => {
    expect(reviewSortSchema.safeParse("popular").success).toBe(false);
  });
});

describe("reviewImportRowSchema", () => {
  it("accepts a full import row with defaults", () => {
    const res = reviewImportRowSchema.safeParse({
      targetType: "product",
      targetId: "p1",
      personId: "person1",
      rating: 5,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.verified).toBe(false);
      expect(res.data.verifiedMethod).toBe("none");
    }
  });
});
