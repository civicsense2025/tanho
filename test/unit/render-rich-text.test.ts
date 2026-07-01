import { describe, it, expect } from "vitest";
import { renderRichText } from "@/lib/richtext/renderRichText";

// renderRichText is the trust boundary for stored rich-text HTML (TipTap output and the
// HTML-mode textarea alike): it re-sanitizes at render time through the site allowlist, so a
// stored string can never ship a <script> or other disallowed tag to dangerouslySetInnerHTML.
describe("renderRichText", () => {
  it("strips disallowed tags like <script> via the allowlist", () => {
    const out = renderRichText("<p>ok</p><script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("<p>ok</p>");
  });

  it("passes through allowlisted inline tags (p, strong, em, u, s)", () => {
    const out = renderRichText("<p><strong>b</strong><em>e</em><u>u</u><s>s</s></p>");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<em>e</em>");
    expect(out).toContain("<u>u</u>");
    expect(out).toContain("<s>s</s>");
  });

  it("handles empty string input without throwing", () => {
    expect(() => renderRichText("")).not.toThrow();
    expect(renderRichText("")).toBe("");
  });

  it("keeps the <u> underline tag (newly allowlisted for TipTap)", () => {
    expect(renderRichText("<u>under</u>")).toContain("<u>under</u>");
  });
});
