import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./svg-sanitize";

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${inner}</svg>`;

describe("sanitizeSvg", () => {
  it("keeps a clean presentational logo", () => {
    const clean = sanitizeSvg(wrap('<circle cx="5" cy="5" r="4" fill="#07f"/>'));
    expect(clean).not.toBeNull();
    expect(clean).toContain("<svg");
    expect(clean).toContain("<circle");
    expect(clean).toContain("</svg>");
  });

  it("strips inline <script>", () => {
    const clean = sanitizeSvg(wrap('<script>alert(1)</script><rect width="10" height="10"/>'));
    expect(clean).not.toBeNull();
    expect(clean!.toLowerCase()).not.toContain("<script");
    expect(clean!.toLowerCase()).not.toContain("alert(1)");
  });

  it("strips event handlers (onload/onclick)", () => {
    const clean = sanitizeSvg(wrap('<rect width="10" height="10" onload="alert(1)" onclick="evil()"/>'));
    expect(clean).not.toBeNull();
    expect(clean!.toLowerCase()).not.toContain("onload");
    expect(clean!.toLowerCase()).not.toContain("onclick");
  });

  it("strips <style> blocks (CSS @import / url() beacons are not sanitized by DOMPurify)", () => {
    const clean = sanitizeSvg(
      wrap('<style>@import url("https://evil.example/x.css");rect{fill:url("https://evil.example/track")}</style><rect width="10" height="10"/>'),
    );
    expect(clean).not.toBeNull();
    expect(clean!.toLowerCase()).not.toContain("<style");
    expect(clean!.toLowerCase()).not.toContain("@import");
    expect(clean!.toLowerCase()).not.toContain("evil.example");
  });

  it("strips <foreignObject> (HTML injection vector)", () => {
    const clean = sanitizeSvg(wrap('<foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>x</script></body></foreignObject>'));
    // Either the whole thing collapses to an empty svg (rejected) or the
    // foreignObject/script are gone.
    if (clean !== null) {
      expect(clean.toLowerCase()).not.toContain("foreignobject");
      expect(clean.toLowerCase()).not.toContain("<script");
    }
  });

  it("removes javascript: hrefs / anchors", () => {
    const clean = sanitizeSvg(wrap('<a href="javascript:alert(1)"><rect width="10" height="10"/></a>'));
    if (clean !== null) {
      expect(clean.toLowerCase()).not.toContain("javascript:");
    }
  });

  it("rejects non-SVG or empty input", () => {
    expect(sanitizeSvg("")).toBeNull();
    expect(sanitizeSvg("<html><body>nope</body></html>")).toBeNull();
    expect(sanitizeSvg("just text")).toBeNull();
  });

  it("rejects an oversized document", () => {
    const huge = wrap("<rect/>".repeat(200_000));
    expect(sanitizeSvg(huge)).toBeNull();
  });
});
