import { describe, expect, it } from "vitest";
import { resolvePathTemplate } from "./paths";

describe("resolvePathTemplate", () => {
  it("flat pattern → /base/slug", () => {
    expect(resolvePathTemplate("{base}/{slug}", "/recipes", "cake", "")).toBe("/recipes/cake");
  });

  it("nested pattern with a parent path", () => {
    // parent is /recipes/desserts → child 'cake' → /recipes/desserts/cake
    expect(
      resolvePathTemplate("{base}/{parent_path}/{slug}", "/recipes", "cake", "/recipes/desserts"),
    ).toBe("/recipes/desserts/cake");
  });

  it("nested pattern at the top level collapses the empty parent segment", () => {
    // no parent → parent_path is "" → the doubled slash collapses
    expect(resolvePathTemplate("{base}/{parent_path}/{slug}", "/recipes", "cake", "")).toBe("/recipes/cake");
  });

  it("resolves multi-level nesting (parent already deep)", () => {
    expect(
      resolvePathTemplate("{base}/{parent_path}/{slug}", "/docs", "install", "/docs/guide/getting-started"),
    ).toBe("/docs/guide/getting-started/install");
  });

  it("strips a trailing slash from the base", () => {
    expect(resolvePathTemplate("{base}/{slug}", "/recipes/", "cake", "")).toBe("/recipes/cake");
  });

  it("falls back to the flat pattern when none is given", () => {
    expect(resolvePathTemplate("", "/x", "y", "")).toBe("/x/y");
  });
});
