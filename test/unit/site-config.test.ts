import { describe, it, expect } from "vitest";
import { envFlag, siteConfig } from "@/config/site.config";

// envFlag is the defensive parser guarding every feature toggle: only exact "true"/"1"
// (case-insensitive) enable, only "false"/"0" disable, everything else — including a typo
// or unset — falls back. A regression here would silently flip a module on/off for a
// white-label instance, so pin every branch.
describe("envFlag", () => {
  it("returns the fallback when unset", () => {
    expect(envFlag(undefined, false)).toBe(false);
    expect(envFlag(undefined, true)).toBe(true);
  });

  it("enables on 'true'/'1' case-insensitively", () => {
    for (const v of ["true", "TRUE", "True", "1", " 1 "]) {
      expect(envFlag(v, false)).toBe(true);
    }
  });

  it("disables on 'false'/'0'", () => {
    for (const v of ["false", "FALSE", "0", " 0 "]) {
      expect(envFlag(v, true)).toBe(false);
    }
  });

  it("falls back on an unrecognized value rather than guessing", () => {
    expect(envFlag("yes", false)).toBe(false);
    expect(envFlag("on", true)).toBe(true);
    expect(envFlag("", false)).toBe(false);
  });
});

describe("siteConfig", () => {
  it("is frozen so shared identity can't be mutated at runtime", () => {
    expect(Object.isFrozen(siteConfig)).toBe(true);
  });

  it("defaults guides on and the additive modules off", () => {
    // With no NEXT_PUBLIC_FEATURE_* env set in the test process, the built-in defaults apply.
    expect(siteConfig.features.guides).toBe(true);
    expect(siteConfig.features.payments).toBe(false);
    expect(siteConfig.features.ai).toBe(false);
    expect(siteConfig.features.newsletter).toBe(false);
  });

  it("normalizes the URL with no trailing slash", () => {
    expect(siteConfig.url.endsWith("/")).toBe(false);
  });

  it("resolves mode to a known value", () => {
    expect(["static", "dynamic"]).toContain(siteConfig.mode);
  });

  it("defaults theme mode to system (preserving OS auto-dark)", () => {
    expect(["light", "dark", "system"]).toContain(siteConfig.theme.defaultMode);
    // No NEXT_PUBLIC_THEME_MODE set in the test process → the auto-dark-preserving default.
    expect(siteConfig.theme.defaultMode).toBe("system");
  });
});
