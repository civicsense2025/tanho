import { describe, expect, it } from "vitest";
import { typeVars } from "./scales";

const BASE_INPUT = { font: "geist" as const, baseSize: 16, headingScale: 1, leading: 1.6 };

describe("typeVars — fluid heading sizes", () => {
  it("display/h1/h2 emit a clamp() that lands on today's exact value at the desktop end", () => {
    const vars = typeVars(BASE_INPUT);
    // MAX must be unchanged from the pre-fluid flat value — a zero-visual-diff
    // baseline at/above the desktop breakpoint (1024px).
    expect(vars["--text-display"]).toMatch(/clamp\([^,]+,[^,]+, 2\.25rem\)/);
    expect(vars["--text-h1"]).toMatch(/clamp\([^,]+,[^,]+, 1\.875rem\)/);
    expect(vars["--text-h2"]).toMatch(/clamp\([^,]+,[^,]+, 1\.25rem\)/);
  });

  it("the clamp() MIN is a fixed ratio below MAX, not an arbitrary number", () => {
    const vars = typeVars(BASE_INPUT);
    const min = vars["--text-display"]!.match(/clamp\(([\d.]+)rem/)![1];
    expect(+min!).toBeCloseTo(2.25 * 0.82, 3);
  });

  it("scales with headingScale (Brand screen input), same as the old flat sizing did", () => {
    const scaled = typeVars({ ...BASE_INPUT, headingScale: 1.2 });
    expect(scaled["--text-h1"]).toContain("2.25rem"); // 1.875 * 1.2 = 2.25 exactly
  });

  it("scales with baseSize too", () => {
    const bigger = typeVars({ ...BASE_INPUT, baseSize: 20 });
    // 1.25rem * (20/16) = 1.5625rem
    expect(bigger["--text-h2"]).toContain("1.563rem");
  });

  it("non-heading sizes (body/sm/xs/2xs/lg) stay flat — no clamp(), unchanged shape", () => {
    const vars = typeVars(BASE_INPUT);
    expect(vars["--text-body"]).toBe("1rem");
    expect(vars["--text-lg"]).toBe("1.125rem");
    expect(vars["--text-sm"]).toBe("0.875rem");
    expect(vars["--text-xs"]).toBe("0.75rem");
    expect(vars["--text-2xs"]).toBe("0.625rem");
    for (const k of ["--text-body", "--text-lg", "--text-sm", "--text-xs", "--text-2xs"]) {
      expect(vars[k]).not.toContain("clamp");
    }
  });

  it("emitted clamp() only uses characters allow-listed by css-vars.ts's SAFE_VALUE_RE", () => {
    const SAFE_VALUE_RE = /^[#a-zA-Z0-9(),.\s%\-\/"'+]+$/;
    const vars = typeVars(BASE_INPUT);
    expect(SAFE_VALUE_RE.test(vars["--text-display"]!)).toBe(true);
    expect(SAFE_VALUE_RE.test(vars["--text-h1"]!)).toBe(true);
    expect(SAFE_VALUE_RE.test(vars["--text-h2"]!)).toBe(true);
  });

  /**
   * Regression guard: evaluates the emitted `clamp(min, intercept + coefvw, max)`
   * string exactly as a browser would at a given viewport width, in PX (the unit
   * `vw` always resolves in) — NOT by re-deriving the formula, which would just
   * repeat whatever bug produced the string in the first place. This is what
   * caught the original bug: the vw coefficient was computed in rem-per-percent
   * instead of px-per-percent, so `--text-h1` at 1280px resolved to the MIN
   * (24.592px) instead of the MAX (30px) — every structural (regex-shape) test
   * above still passed, because they only checked the endpoints' literal text,
   * never what a real viewport width evaluates the middle term to.
   */
  function evalClampPx(clampStr: string, viewportPx: number): number {
    const m = clampStr.match(/^clamp\(([\d.]+)rem, ([\d.]+)rem \+ ([\d.]+)vw, ([\d.]+)rem\)$/);
    if (!m) throw new Error(`unexpected clamp() shape: ${clampStr}`);
    const [, minRem, interceptRem, vwCoef, maxRem] = m.map(Number) as unknown as [number, number, number, number, number];
    const ROOT_PX = 16;
    const preferredPx = interceptRem * ROOT_PX + vwCoef * (viewportPx / 100);
    return Math.min(Math.max(preferredPx, minRem * ROOT_PX), maxRem * ROOT_PX);
  }

  // Precision note: the production code rounds each coefficient to 3 decimal
  // places for a readable CSS string, which compounds to ~0.001px of rounding
  // noise here — toBeCloseTo(…, 2) asserts to the nearest 0.01px, tight enough
  // to catch the actual bug class (a wrong coefficient is off by an order of
  // magnitude or more) without failing on intentional CSS-string rounding.
  it("resolves to the exact MAX px at the desktop breakpoint (1024px) — not the min", () => {
    const vars = typeVars(BASE_INPUT);
    expect(evalClampPx(vars["--text-h1"]!, 1024)).toBeCloseTo(1.875 * 16, 2);
    expect(evalClampPx(vars["--text-display"]!, 1024)).toBeCloseTo(2.25 * 16, 2);
  });

  it("resolves to the exact MIN px at the mobile canvas width (390px)", () => {
    const vars = typeVars(BASE_INPUT);
    expect(evalClampPx(vars["--text-h1"]!, 390)).toBeCloseTo(1.537 * 16, 2);
  });

  it("stays pinned at MAX above the desktop breakpoint (clamp() ceiling, not linear runaway)", () => {
    const vars = typeVars(BASE_INPUT);
    expect(evalClampPx(vars["--text-h1"]!, 1280)).toBeCloseTo(1.875 * 16, 2);
  });

  it("is monotonically increasing between the two endpoints (genuinely fluid, not flat)", () => {
    const vars = typeVars(BASE_INPUT);
    const at500 = evalClampPx(vars["--text-h1"]!, 500);
    const at700 = evalClampPx(vars["--text-h1"]!, 700);
    const at900 = evalClampPx(vars["--text-h1"]!, 900);
    expect(at500).toBeLessThan(at700);
    expect(at700).toBeLessThan(at900);
    expect(at900).toBeLessThan(1.875 * 16);
  });
});
