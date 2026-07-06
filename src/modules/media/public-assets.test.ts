import { describe, expect, it } from "vitest";
import { safePublicName } from "./public-assets";

/**
 * safePublicName is the injection boundary for the upload-to-/public write path:
 * the extension is forced from the trusted MIME map and the stem is reduced to a
 * conservative charset with no path parts, so a hostile filename can never
 * escape the public root or smuggle a scriptable extension.
 */
describe("safePublicName", () => {
  it("keeps a normal name and forces the trusted extension", () => {
    expect(safePublicName("my-logo.png", "png")).toBe("my-logo.png");
    // the author's extension is dropped and replaced by the trusted one
    expect(safePublicName("photo.jpeg", "jpg")).toBe("photo.jpg");
  });

  it("strips any directory part (no path traversal via the name)", () => {
    expect(safePublicName("../../etc/passwd", "png")).toBe("passwd.png");
    expect(safePublicName("/abs/evil.png", "png")).toBe("evil.png");
    expect(safePublicName("a/b/c.png", "png")).toBe("c.png");
    expect(safePublicName("..\\..\\win.png", "png")).toBe("win.png");
  });

  it("never produces a scriptable extension even if the name asks for one", () => {
    // the author asking for .svg/.html is irrelevant — ext comes from the MIME map
    expect(safePublicName("logo.svg", "png")).toBe("logo.png");
    expect(safePublicName("x.html", "png")).toBe("x.png");
  });

  it("reduces a hostile stem to a conservative charset", () => {
    expect(safePublicName("a b&c;<d>.png", "png")).toBe("a-b-c-d.png");
    expect(safePublicName("  spaced  .png", "png")).toBe("spaced.png");
  });

  it("falls back to 'asset' when the stem reduces to nothing", () => {
    expect(safePublicName("...png", "png")).toBe("asset.png");
    expect(safePublicName("", "png")).toBe("asset.png");
    expect(safePublicName("///", "png")).toBe("asset.png");
  });

  it("has no leading/trailing dot or dash and is length-capped", () => {
    expect(safePublicName(".-.hidden.-.png", "png")).toBe("hidden.png");
    const long = "x".repeat(300);
    const out = safePublicName(`${long}.png`, "png");
    expect(out.endsWith(".png")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(104); // 100 stem + ".png"
  });

  it("a collision suffix built from the sanitised stem keeps its unique token", () => {
    // Regression: uploadToPublicAction's clash path must NOT round-trip through
    // safePublicName (its extension-strip would eat the token on a dotted name).
    // It builds `${stem}-${token}.${ext}` directly — this asserts the stem-strip
    // + reassembly the action relies on preserves the token.
    const name = safePublicName("my.photo.final.png", "png"); // "my.photo.final.png"
    const ext = "png";
    const stem = name.replace(new RegExp(`\\.${ext}$`), ""); // "my.photo.final"
    const suffixed = `${stem}-abc123.${ext}`;
    expect(suffixed).toBe("my.photo.final-abc123.png"); // token intact, not "my.photo.png"
  });
});
