import { describe, expect, it } from "vitest";
import { slugify, slugifyLive, dedupeSlugs } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("collapses runs of non-alphanumerics to one hyphen", () => {
    expect(slugify("A  --  B__C")).toBe("a-b-c");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugify("  !Hello!  ")).toBe("hello");
  });
  it("folds diacritics to ASCII", () => {
    expect(slugify("Café Über")).toBe("cafe-uber");
  });
  it("caps length and never leaves a trailing hyphen from the cut", () => {
    const s = slugify("a".repeat(50) + " " + "b".repeat(50), 51);
    expect(s.length).toBeLessThanOrEqual(51);
    expect(s.endsWith("-")).toBe(false);
  });
  it("returns empty string for punctuation-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("slugifyLive (controlled inputs)", () => {
  it("keeps a trailing hyphen so hyphenated slugs are typeable", () => {
    expect(slugifyLive("summer-")).toBe("summer-");
    expect(slugifyLive("summer-sale")).toBe("summer-sale");
  });
  it("still strips leading hyphens and invalid characters", () => {
    expect(slugifyLive("-lead")).toBe("lead");
    expect(slugifyLive("My Collection!")).toBe("my-collection-");
  });
  it("folds diacritics like the strict form", () => {
    expect(slugifyLive("Café")).toBe("cafe");
  });
  it("strict slugify normalizes the live form for persistence", () => {
    expect(slugify(slugifyLive("summer-"))).toBe("summer");
  });
});

describe("dedupeSlugs", () => {
  it("suffixes repeats with -2, -3 while the first stays bare", () => {
    expect(dedupeSlugs(["Overview", "Overview", "Overview"])).toEqual([
      "overview",
      "overview-2",
      "overview-3",
    ]);
  });
  it("treats slugs that collapse to the same base as duplicates", () => {
    expect(dedupeSlugs(["Set Up", "set-up"])).toEqual(["set-up", "set-up-2"]);
  });
  it("falls back to 'section' for blank/punctuation headings", () => {
    expect(dedupeSlugs(["", "!!!"])).toEqual(["section", "section-2"]);
  });
  it("preserves order", () => {
    expect(dedupeSlugs(["B", "A", "B"])).toEqual(["b", "a", "b-2"]);
  });

  it("never emits a duplicate when a -N suffix collides with a natural slug", () => {
    // The counter's "usage-2" would clash with slugified "Usage 2"; the suffix
    // must advance past it. All results must be unique (no shared DOM ids).
    const out = dedupeSlugs(["Usage", "Usage", "Usage 2"]);
    expect(new Set(out).size).toBe(out.length);
    expect(out).toEqual(["usage", "usage-2", "usage-2-2"]);
  });

  it("advances the suffix when a natural slug precedes the collision", () => {
    // "foo-2" is taken up front, so the 2nd "Foo" skips it: foo → (foo-2 taken) → foo-3.
    const out = dedupeSlugs(["foo-2", "Foo", "Foo"]);
    expect(new Set(out).size).toBe(out.length);
    expect(out).toEqual(["foo-2", "foo", "foo-3"]);
  });
});
