import { describe, expect, it } from "vitest";
import {
  COURSE_TAX_CODES,
  DEFAULT_TAX_CODE_BY_KIND,
  SHIPPING_TAX_CODE,
  resolveTaxCode,
} from "./tax-codes";

describe("DEFAULT_TAX_CODE_BY_KIND", () => {
  it("has a code for every product kind", () => {
    expect(DEFAULT_TAX_CODE_BY_KIND.physical).toBe("txcd_99999999");
    expect(DEFAULT_TAX_CODE_BY_KIND.digital).toBe("txcd_10103000");
    expect(DEFAULT_TAX_CODE_BY_KIND.service).toBe("txcd_20030000");
    expect(DEFAULT_TAX_CODE_BY_KIND.course).toBe("txcd_20060158");
  });

  it("uses the streamed-course code (not downloadable software) for courses", () => {
    // The adversarial review caught that txcd_10202000 (downloadable software)
    // was the wrong default for courses. Stripe has dedicated course codes.
    expect(DEFAULT_TAX_CODE_BY_KIND.course).toBe(COURSE_TAX_CODES.streamed);
    expect(DEFAULT_TAX_CODE_BY_KIND.course).not.toBe("txcd_10202000");
  });
});

describe("COURSE_TAX_CODES", () => {
  it("exposes streamed, streamedAndDownloadable, and liveEducationalService codes", () => {
    expect(COURSE_TAX_CODES.streamed).toBe("txcd_20060158");
    expect(COURSE_TAX_CODES.streamedAndDownloadable).toBe("txcd_20060258");
    expect(COURSE_TAX_CODES.liveEducationalService).toBe("txcd_20060052");
  });
});

describe("SHIPPING_TAX_CODE", () => {
  it("is Stripe's dedicated shipping tax code", () => {
    expect(SHIPPING_TAX_CODE).toBe("txcd_92010001");
  });
});

describe("resolveTaxCode", () => {
  it("returns the explicit code when provided", () => {
    expect(resolveTaxCode("physical", "txcd_10000000")).toBe("txcd_10000000");
  });

  it("trims whitespace from the explicit code", () => {
    expect(resolveTaxCode("physical", "  txcd_10000000  ")).toBe("txcd_10000000");
  });

  it("falls back to the kind default when explicit is empty", () => {
    expect(resolveTaxCode("digital", "")).toBe(DEFAULT_TAX_CODE_BY_KIND.digital);
  });

  it("falls back to the kind default when explicit is null/undefined", () => {
    expect(resolveTaxCode("course", null)).toBe(DEFAULT_TAX_CODE_BY_KIND.course);
    expect(resolveTaxCode("course", undefined)).toBe(DEFAULT_TAX_CODE_BY_KIND.course);
  });

  it("falls back to the kind default when explicit is whitespace-only", () => {
    expect(resolveTaxCode("service", "   ")).toBe(DEFAULT_TAX_CODE_BY_KIND.service);
  });
});
