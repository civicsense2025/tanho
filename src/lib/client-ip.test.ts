import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("prefers x-vercel-forwarded-for when present", () => {
    const h = new Headers({ "x-vercel-forwarded-for": "5.6.7.8" });
    expect(clientIp(h)).toBe("5.6.7.8");
  });

  it("uses cf-connecting-ip when present", () => {
    const h = new Headers({ "cf-connecting-ip": "9.9.9.9" });
    expect(clientIp(h)).toBe("9.9.9.9");
  });

  it("uses x-real-ip when present", () => {
    const h = new Headers({ "x-real-ip": "8.8.8.8" });
    expect(clientIp(h)).toBe("8.8.8.8");
  });

  it("uses the rightmost x-forwarded-for entry (not the client-controlled leftmost)", () => {
    const h = new Headers({ "x-forwarded-for": "spoofed, real-client" });
    expect(clientIp(h)).toBe("real-client");
  });

  it("handles a single x-forwarded-for value", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(clientIp(h)).toBe("1.2.3.4");
  });

  it("returns 'local' when no IP headers are present", () => {
    expect(clientIp(new Headers())).toBe("local");
  });

  it("platform header takes precedence over x-forwarded-for", () => {
    const h = new Headers({
      "x-vercel-forwarded-for": "trusted",
      "x-forwarded-for": "spoofed",
    });
    expect(clientIp(h)).toBe("trusted");
  });
});
