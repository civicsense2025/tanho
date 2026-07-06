import { describe, expect, it } from "vitest";
import { buildFontFaceCss, cssStackFor, primaryPreloadUrl } from "./css";
import type { fontFaces, fontFamilies } from "./schema";

type FamilyRow = typeof fontFamilies.$inferSelect;
type FaceRow = typeof fontFaces.$inferSelect;

const fam = (over: Partial<FamilyRow> = {}): FamilyRow => ({
  id: "fam1",
  name: "Inter",
  source: "custom",
  status: "active",
  createdAt: 0,
  ...over,
});

const face = (over: Partial<FaceRow> = {}): FaceRow => ({
  id: "face1",
  familyId: "fam1",
  mediaId: "m1",
  weight: 400,
  style: "normal",
  displayName: "Regular",
  unicodeRange: "",
  isVariable: false,
  createdAt: 0,
  ...over,
});

const urlFor = (id: string): string | null =>
  id === "m1" ? "/api/media/abc123.woff2" : id === "m2" ? "/api/media/def456.ttf" : null;

describe("cssStackFor", () => {
  it("quotes a safe family name and adds a fallback", () => {
    expect(cssStackFor("Inter")).toBe('"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif');
    expect(cssStackFor("My Brand 2")).toContain('"My Brand 2"');
  });

  it("rejects unsafe family names", () => {
    expect(cssStackFor('Inter"; } body{display:none')).toBeNull();
    expect(cssStackFor("</style><script>")).toBeNull();
    expect(cssStackFor("")).toBeNull();
  });
});

describe("buildFontFaceCss", () => {
  it("emits a well-formed @font-face for a valid face", () => {
    const css = buildFontFaceCss([fam()], [face()], urlFor);
    expect(css).toContain("@font-face");
    expect(css).toContain('font-family:"Inter"');
    expect(css).toContain('src:url("/api/media/abc123.woff2") format("woff2")');
    expect(css).toContain("font-weight:400");
    expect(css).toContain("font-display:swap");
  });

  it("infers format from extension (ttf → truetype)", () => {
    const css = buildFontFaceCss([fam()], [face({ mediaId: "m2" })], urlFor);
    expect(css).toContain('format("truetype")');
  });

  it("drops a face whose family name is hostile (defense in depth)", () => {
    const css = buildFontFaceCss([fam({ name: 'X"; }' })], [face()], urlFor);
    expect(css).toBe("");
  });

  it("drops a face whose URL is not our own media route", () => {
    const evil = (id: string) => (id === "m1" ? "https://evil.example/x.woff2" : null);
    expect(buildFontFaceCss([fam()], [face()], evil)).toBe("");
  });

  it("only emits a safe unicode-range", () => {
    const ok = buildFontFaceCss([fam()], [face({ unicodeRange: "U+000-5FF" })], urlFor);
    expect(ok).toContain("unicode-range:U+000-5FF");
    const bad = buildFontFaceCss([fam()], [face({ unicodeRange: "}; evil" })], urlFor);
    expect(bad).not.toContain("evil");
  });
});

describe("primaryPreloadUrl", () => {
  it("prefers the normal 400 woff2 face", () => {
    const faces = [face({ id: "a", weight: 700 }), face({ id: "b", weight: 400 })];
    expect(primaryPreloadUrl("fam1", faces, urlFor)).toBe("/api/media/abc123.woff2");
  });

  it("returns null for a non-woff2 primary", () => {
    expect(primaryPreloadUrl("fam1", [face({ mediaId: "m2" })], urlFor)).toBeNull();
  });

  it("returns null when no family is active", () => {
    expect(primaryPreloadUrl(null, [face()], urlFor)).toBeNull();
  });
});
