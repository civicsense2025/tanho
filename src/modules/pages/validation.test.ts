import { describe, expect, it } from "vitest";
import { secureCustomCode, OWNER_ONLY_PAGE_FIELDS } from "./validation";

/**
 * `secureCustomCode` is the ONE authoritative gate for per-page custom code, shared by
 * the server action AND the REST route so neither can bypass the other. Two invariants:
 *   1. Owner-only verbatim code (head/body HTML) is STRIPPED for non-owners.
 *   2. customCss is ALWAYS sanitised (any admin), never rendered raw.
 * A regression here is a stored-XSS / privilege-escalation hole — treat as a blocker.
 */
describe("secureCustomCode — owner gate + CSS sanitisation", () => {
  it("strips head/body HTML for a NON-owner (editor), keeps other fields", () => {
    const data: Record<string, unknown> = {
      title: "Hi",
      customHeadHtml: "<script>steal()</script>",
      customBodyHtml: "<script>widget()</script>",
    };
    secureCustomCode(data, /* isOwner */ false);
    expect(data.customHeadHtml).toBeUndefined();
    expect(data.customBodyHtml).toBeUndefined();
    expect(data.title).toBe("Hi"); // untouched
    // Both owner-only fields are covered.
    for (const f of OWNER_ONLY_PAGE_FIELDS) expect(data[f]).toBeUndefined();
  });

  it("keeps head/body HTML VERBATIM for an owner (real script, not sanitised)", () => {
    const head = "<script>analytics()</script>";
    const data: Record<string, unknown> = { customHeadHtml: head };
    secureCustomCode(data, /* isOwner */ true);
    expect(data.customHeadHtml).toBe(head); // unchanged, on purpose
  });

  it("ALWAYS sanitises customCss — for owner AND editor", () => {
    for (const isOwner of [true, false]) {
      const data: Record<string, unknown> = {
        customCss: "</style><script>x</script> .a{color:red}",
      };
      secureCustomCode(data, isOwner);
      // The breakout is gone; sanitizeCss returns "" on a structural breakout.
      expect(String(data.customCss)).not.toMatch(/<script|<\/style/i);
    }
  });

  it("keeps a safe customCss rule (scoped) through the gate", () => {
    const data: Record<string, unknown> = { customCss: ".card { border-radius: 8px }" };
    secureCustomCode(data, false);
    expect(String(data.customCss)).toContain("border-radius");
    expect(String(data.customCss)).toContain("pb-custom-scope"); // scoped
  });

  it("is a no-op for keys that aren't present (partial payloads)", () => {
    const data: Record<string, unknown> = { title: "only" };
    secureCustomCode(data, false);
    expect(data).toEqual({ title: "only" });
  });

  it("empty customCss stays empty, not turned into junk", () => {
    const data: Record<string, unknown> = { customCss: "" };
    secureCustomCode(data, true);
    expect(data.customCss).toBe("");
  });
});
