import { describe, expect, it } from "vitest";
import { EVENT_NAME_RE, sanitizeProps, trackInputSchema } from "./validation";

describe("event name allowlist", () => {
  it("accepts snake_case names", () => {
    for (const name of ["pageview", "cta_click", "signup2", "a"]) {
      expect(EVENT_NAME_RE.test(name)).toBe(true);
    }
  });

  it("rejects uppercase, spaces, punctuation, and over-long names", () => {
    for (const name of ["Pageview", "cta click", "cta-click", "a.b", "", "x".repeat(41)]) {
      expect(EVENT_NAME_RE.test(name)).toBe(false);
    }
  });

  it("trackInputSchema rejects a bad name", () => {
    expect(trackInputSchema.safeParse({ name: "Bad Name" }).success).toBe(false);
    expect(trackInputSchema.safeParse({ name: "good_name", path: "/x" }).success).toBe(true);
  });
});

describe("sanitizeProps (PII guard)", () => {
  it("keeps only scalars and truncates long strings", () => {
    const out = sanitizeProps({
      tier: "pro",
      count: 3,
      featured: true,
      long: "x".repeat(500),
      nested: { a: 1 },
      arr: [1, 2, 3],
      nan: Number.NaN,
    });
    expect(out.tier).toBe("pro");
    expect(out.count).toBe(3);
    expect(out.featured).toBe(true);
    expect((out.long as string).length).toBe(120);
    expect("nested" in out).toBe(false);
    expect("arr" in out).toBe(false);
    expect("nan" in out).toBe(false);
  });

  it("caps the number of keys", () => {
    const raw: Record<string, unknown> = {};
    for (let i = 0; i < 50; i++) raw[`k${i}`] = i;
    expect(Object.keys(sanitizeProps(raw)).length).toBeLessThanOrEqual(12);
  });

  it("returns an empty object for undefined", () => {
    expect(sanitizeProps(undefined)).toEqual({});
  });
});
