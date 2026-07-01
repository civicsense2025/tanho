import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isSameOriginRequest } from "../../src/proxy";

/** Builds a NextRequest at https://site.example/api/settings with the given headers. */
function req(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://site.example/api/settings", { method: "POST", headers });
}

describe("isSameOriginRequest (CSRF origin check)", () => {
  it("accepts a matching Origin", () => {
    expect(isSameOriginRequest(req({ origin: "https://site.example" }))).toBe(true);
  });

  it("rejects a foreign Origin", () => {
    expect(isSameOriginRequest(req({ origin: "https://evil.example" }))).toBe(false);
  });

  it("falls back to Referer origin when Origin is absent", () => {
    expect(isSameOriginRequest(req({ referer: "https://site.example/admin/settings" }))).toBe(true);
    expect(isSameOriginRequest(req({ referer: "https://evil.example/x" }))).toBe(false);
  });

  it("allows requests with neither Origin nor Referer (non-browser callers)", () => {
    expect(isSameOriginRequest(req({}))).toBe(true);
  });

  it("rejects a malformed Referer when Origin is absent", () => {
    expect(isSameOriginRequest(req({ referer: "not-a-url" }))).toBe(false);
  });
});
