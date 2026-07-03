import { describe, expect, it } from "vitest";
import { pageRenderMode, renderModeHint } from "./render-mode";

describe("pageRenderMode", () => {
  it("is dynamic when the page has a paywall", () => {
    expect(pageRenderMode({ hasPaywall: true })).toBe("dynamic");
  });

  it("is static when the page has no paywall", () => {
    expect(pageRenderMode({ hasPaywall: false })).toBe("static");
  });

  it("is static when hasPaywall is undefined", () => {
    expect(pageRenderMode({})).toBe("static");
  });
});

describe("renderModeHint", () => {
  it("explains dynamic mode", () => {
    expect(renderModeHint("dynamic")).toMatch(/paywall/i);
  });

  it("explains static mode", () => {
    expect(renderModeHint("static")).toMatch(/cached/i);
  });
});
