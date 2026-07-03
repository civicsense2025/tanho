import { describe, expect, it } from "vitest";
import { applyTemplate } from "./templating";

describe("applyTemplate", () => {
  it("substitutes all four tokens", () => {
    const out = applyTemplate("{title} · {tag} — {excerpt} @ {site}", {
      title: "My Post",
      tag: "News",
      excerpt: "A summary",
      site: "Acme",
    });
    expect(out).toBe("My Post · News — A summary @ Acme");
  });

  it("replaces every occurrence of a repeated token", () => {
    expect(applyTemplate("{site} {site}", { site: "Acme" })).toBe("Acme Acme");
  });

  it("treats missing vars as empty and trims", () => {
    expect(applyTemplate("{title}{excerpt}", {})).toBe("");
  });

  it("strips angle brackets from the output (no markup injection)", () => {
    const out = applyTemplate("{title}", {
      title: '<script>alert(1)</script>',
    });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).toBe("scriptalert(1)/script");
  });

  it("strips angle brackets even when they come from the template itself", () => {
    expect(applyTemplate("<b>{title}</b>", { title: "Hi" })).toBe("bHi/b");
  });
});
