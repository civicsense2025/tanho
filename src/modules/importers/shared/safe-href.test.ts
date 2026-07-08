import { describe, expect, it } from "vitest";
import { safeHref } from "./safe-href";

describe("safeHref", () => {
  it("allows http and https URLs", () => {
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
  });

  it("allows mailto URLs", () => {
    expect(safeHref("mailto:foo@bar.com")).toBe("mailto:foo@bar.com");
  });

  it("allows schemeless relative URLs", () => {
    expect(safeHref("/relative/path")).toBe("/relative/path");
    expect(safeHref("#anchor")).toBe("#anchor");
    expect(safeHref("?query=1")).toBe("?query=1");
    expect(safeHref("bare/path")).toBe("bare/path");
  });

  it("rejects javascript:", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
  });

  it("rejects data:", () => {
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects vbscript: and file:", () => {
    expect(safeHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeHref("file:///etc/passwd")).toBeNull();
  });

  it("rejects any other unknown scheme", () => {
    expect(safeHref("customscheme:whatever")).toBeNull();
  });

  it("rejects an obfuscated scheme with embedded control chars", () => {
    expect(safeHref("java\tscript:alert(1)")).toBeNull();
    expect(safeHref("java\nscript:alert(1)")).toBeNull();
  });

  it("rejects empty / whitespace-only input", () => {
    expect(safeHref(null)).toBeNull();
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });

  it("trims surrounding whitespace from a safe URL", () => {
    expect(safeHref("  https://example.com  ")).toBe("https://example.com");
  });
});
