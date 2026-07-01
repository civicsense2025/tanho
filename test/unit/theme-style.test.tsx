import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeStyle } from "@/components/ThemeStyle";

// ThemeStyle interpolates owner config into a <style>. It must ONLY emit values passing a strict
// allowlist so a malformed/hostile value can neither break the CSS nor inject markup.
function render(theme: Parameters<typeof ThemeStyle>[0]["theme"]) {
  return renderToStaticMarkup(<ThemeStyle theme={theme} />);
}

describe("ThemeStyle", () => {
  it("emits nothing when no overrides are set", () => {
    expect(render({ defaultMode: "system" })).toBe("");
  });

  it("emits valid hex accents and a safe font", () => {
    const html = render({ defaultMode: "light", accent: "#6e2b32", accent2: "#585c34", font: "Inter, sans-serif" });
    expect(html).toContain("--accent:#6e2b32");
    expect(html).toContain("--accent-2:#585c34");
    expect(html).toContain("--font-sans:Inter, sans-serif");
  });

  it("rejects non-hex colors and injection attempts", () => {
    const html = render({
      defaultMode: "light",
      // Not a hex value / contains a CSS-breakout attempt.
      accent: "red; } body { display:none } :root{",
      font: "</style><script>alert(1)</script>",
    });
    // Nothing dangerous made it through; no override block emitted.
    expect(html).not.toContain("display:none");
    expect(html).not.toContain("<script>");
    expect(html).toBe("");
  });
});
