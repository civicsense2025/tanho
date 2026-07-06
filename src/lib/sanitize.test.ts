import { describe, expect, it } from "vitest";
import { sanitizeRichHtml, sanitizeEmbedHtml } from "./sanitize";

/**
 * `sanitizeEmbedHtml` is a SECURITY BOUNDARY — it's the only place the html-embed
 * block's author HTML reaches a page (via dangerouslySetInnerHTML). It must strip
 * scripts and event handlers, harden iframes (sandbox + https), and drop unsafe
 * schemes, while keeping legit embed markup. A regression here is stored XSS.
 */
describe("sanitizeEmbedHtml — embed HTML is hardened", () => {
  it("strips <script> entirely", () => {
    expect(sanitizeEmbedHtml("<script>alert(1)</script><p>ok</p>")).not.toMatch(/<script/i);
    expect(sanitizeEmbedHtml("<script>alert(1)</script><p>ok</p>")).toContain("ok");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeEmbedHtml('<img src="/x.png" onerror="alert(1)">');
    expect(out).not.toMatch(/onerror/i);
  });

  it("keeps an iframe but FORCES a restrictive sandbox + lazy + no-referrer", () => {
    const out = sanitizeEmbedHtml('<iframe src="https://www.youtube.com/embed/x"></iframe>');
    expect(out).toMatch(/<iframe/i);
    expect(out).toMatch(/sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"/);
    expect(out).toMatch(/loading="lazy"/);
    expect(out).toMatch(/referrerpolicy="no-referrer"/);
    // The author cannot widen the sandbox — an author-supplied allow-top-navigation
    // is overwritten by the forced value.
    const forced = sanitizeEmbedHtml('<iframe src="https://x.com" sandbox="allow-top-navigation allow-downloads"></iframe>');
    expect(forced).not.toMatch(/allow-top-navigation/);
    expect(forced).not.toMatch(/allow-downloads/);
  });

  it("drops a javascript: iframe src", () => {
    const out = sanitizeEmbedHtml('<iframe src="javascript:alert(1)"></iframe>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it("allows a hardened video/audio and safe containers", () => {
    const out = sanitizeEmbedHtml('<div class="wrap"><video src="/clip.mp4" controls></video></div>');
    expect(out).toMatch(/<video/i);
    expect(out).toMatch(/controls/);
  });

  it("rich sanitizer still refuses iframes (embed-only widening)", () => {
    // The wider allowlist must NOT leak into the rich-text path.
    expect(sanitizeRichHtml('<iframe src="https://x.com"></iframe>')).not.toMatch(/<iframe/i);
  });
});
