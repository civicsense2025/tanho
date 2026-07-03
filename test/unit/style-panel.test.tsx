import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StylePanel } from "@/lib/blocks/editors/StylePanel";
import { resolveCaps } from "@/lib/blocks/core/style-schema";

// StylePanel is the builder's style UI. These assert the load-bearing behaviors: the inverted
// styleCaps default (absent ⇒ full universal set; present ⇒ narrowing), and that the panel
// exposes the mobile-first breakpoint tabs. Rendering is SSR-only (structure), which is enough
// to prove which controls appear for a given caps input.
function render(caps?: Parameters<typeof StylePanel>[0]["caps"]) {
  return renderToStaticMarkup(<StylePanel style={undefined} caps={caps} onChange={() => {}} />);
}

describe("resolveCaps (inverted default)", () => {
  it("returns the full universal set when caps are absent, but NOT columns (opt-in)", () => {
    const set = resolveCaps(undefined);
    expect(set.has("align")).toBe(true);
    expect(set.has("fontSize")).toBe(true);
    expect(set.has("borderWidth")).toBe(true);
    expect(set.has("visible")).toBe(true);
    expect(set.has("columns")).toBe(false); // optional cap, off unless enabled
  });

  it("treats a present caps object as a NARROWING allow-list", () => {
    const set = resolveCaps({ align: false, columns: true });
    expect(set.has("align")).toBe(false); // explicitly disabled
    expect(set.has("width")).toBe(true); // still on (only align was disabled)
    expect(set.has("columns")).toBe(true); // optional cap explicitly enabled
  });
});

describe("StylePanel", () => {
  it("renders mobile-first breakpoint tabs (Mobile / Tablet / Desktop)", () => {
    const html = render();
    expect(html).toContain("Mobile");
    expect(html).toContain("Tablet");
    expect(html).toContain("Desktop");
  });

  it("shows the full group set for a block with no styleCaps", () => {
    const html = render();
    for (const group of ["Layout", "Spacing", "Typography", "Color", "Border &amp; effects", "Visibility"]) {
      expect(html).toContain(group);
    }
  });

  it("hides a narrowed-out group (spacer-style: only spacing + visibility)", () => {
    // Disable everything except per-side spacing and visibility.
    const html = render({
      align: false, width: false,
      fontSize: false, fontWeight: false, leading: false, tracking: false, font: false,
      color: false, background: false,
      borderWidth: false, borderStyle: false, borderColor: false, radius: false, shadow: false,
      accent: false, theme: false,
    });
    expect(html).toContain("Spacing");
    expect(html).toContain("Visibility");
    expect(html).not.toContain("Typography");
    expect(html).not.toContain("Border &amp; effects");
  });
});
