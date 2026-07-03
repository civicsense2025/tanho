import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents, formatCents } from "./money";

describe("dollarsToCents", () => {
  it("parses whole and fractional dollar strings without float drift", () => {
    expect(dollarsToCents("$45.00")).toBe(4500);
    expect(dollarsToCents("45")).toBe(4500);
    expect(dollarsToCents("$0.99")).toBe(99);
    expect(dollarsToCents("1,299.50")).toBe(129950);
  });

  it("truncates beyond two decimals and pads short fractions", () => {
    expect(dollarsToCents("1.5")).toBe(150);
    expect(dollarsToCents("1.999")).toBe(199);
  });

  it("accepts numbers", () => {
    expect(dollarsToCents(45)).toBe(4500);
    expect(dollarsToCents(0.99)).toBe(99);
  });

  it("returns 0 for empty or invalid input", () => {
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("abc")).toBe(0);
    expect(dollarsToCents(".")).toBe(0);
    expect(dollarsToCents(NaN)).toBe(0);
  });
});

describe("centsToDollars", () => {
  it("renders two decimals", () => {
    expect(centsToDollars(4500)).toBe("45.00");
    expect(centsToDollars(99)).toBe("0.99");
    expect(centsToDollars(0)).toBe("0.00");
    expect(centsToDollars(-150)).toBe("-1.50");
  });

  it("round-trips through dollarsToCents", () => {
    expect(centsToDollars(dollarsToCents("$45.00"))).toBe("45.00");
    expect(formatCents(dollarsToCents("$45.00"))).toBe("$45.00");
  });
});

describe("formatCents", () => {
  it("uses the currency symbol", () => {
    expect(formatCents(4500, "usd")).toBe("$45.00");
    expect(formatCents(99, "eur")).toBe("€0.99");
    expect(formatCents(12300, "gbp")).toBe("£123.00");
    expect(formatCents(500, "cad")).toBe("$5.00");
  });

  it("falls back to $ for unknown currencies", () => {
    expect(formatCents(100, "xyz")).toBe("$1.00");
  });
});
