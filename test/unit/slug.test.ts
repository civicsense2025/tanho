import { describe, it, expect } from "vitest";
import { assertSafeSlug } from "@/lib/content/slug";

// Slugs become filesystem + GitHub Contents API paths and are hand-editable in the admin UI,
// so this guard is a path-traversal boundary, not a cosmetic check. Pin both directions.
describe("assertSafeSlug", () => {
  it("accepts well-formed lowercase kebab slugs", () => {
    for (const s of ["a", "my-project", "substack-to-ghost", "abc123", "x-1-2-3"]) {
      expect(() => assertSafeSlug(s)).not.toThrow();
    }
  });

  it("rejects path separators and traversal sequences", () => {
    for (const s of ["../etc", "a/b", "a\\b", "..", "foo/..", "/abs"]) {
      expect(() => assertSafeSlug(s)).toThrow(/Unsafe slug/);
    }
  });

  it("rejects uppercase, spaces, leading/trailing/double hyphens, and empties", () => {
    for (const s of ["MyProject", "my project", "-lead", "trail-", "double--hyphen", "", "under_score"]) {
      expect(() => assertSafeSlug(s)).toThrow(/Unsafe slug/);
    }
  });
});
