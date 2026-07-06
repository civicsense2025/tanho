import { describe, expect, it } from "vitest";
import { headerHeightVar, isSidebarHeader, HEADER_HEIGHT, TWO_TIER_EXTRA_HEIGHT } from "./chrome-constants";

/**
 * `--header-height` must be published on the shell (an ancestor of page
 * content), computed from the published header tree — see layout.tsx. These pin
 * the value the shell gets for each header shape. The regression this guards:
 * the variable used to be set on `<header>` (a sibling of page content), where
 * inheritance can't reach the heading/section/reading-progress consumers, so it
 * silently resolved to the 0px fallback everywhere.
 */
describe("headerHeightVar", () => {
  it("is the bar height when a normal site-header is present", () => {
    expect(headerHeightVar([{ type: "site-header", content: { transparentOnHero: false } }])).toBe(
      HEADER_HEIGHT,
    );
  });

  it("is 0px when there is no header at all (unseeded / empty tree)", () => {
    expect(headerHeightVar([])).toBe("0px");
    expect(headerHeightVar([{ type: "announcement", content: {} }])).toBe("0px");
  });

  it("is 0px for an overlay (transparent-on-hero) header — it takes no layout height", () => {
    expect(headerHeightVar([{ type: "site-header", content: { transparentOnHero: true } }])).toBe(
      "0px",
    );
  });

  it("finds the site-header even when an announcement precedes it at root", () => {
    expect(
      headerHeightVar([
        { type: "announcement", content: {} },
        { type: "site-header", content: { transparentOnHero: false } },
      ]),
    ).toBe(HEADER_HEIGHT);
  });

  it("tolerates a header with no content object", () => {
    expect(headerHeightVar([{ type: "site-header" }])).toBe(HEADER_HEIGHT);
  });

  it("is 0px for a sidebar-layout header — its height doesn't offset scroll-margin the way a bar's does", () => {
    expect(
      headerHeightVar([{ type: "site-header", content: { layout: "sidebar", transparentOnHero: false } }]),
    ).toBe("0px");
  });

  it("adds TWO_TIER_EXTRA_HEIGHT when the utility strip is showing — the taller bar needs a taller offset", () => {
    expect(
      headerHeightVar([{ type: "site-header", content: { layout: "center", twoTier: true } }]),
    ).toBe(`${parseInt(HEADER_HEIGHT, 10) + TWO_TIER_EXTRA_HEIGHT}px`);
  });

  it("twoTier: false uses the plain bar height, not the two-tier one", () => {
    expect(
      headerHeightVar([{ type: "site-header", content: { layout: "center", twoTier: false } }]),
    ).toBe(HEADER_HEIGHT);
  });
});

describe("isSidebarHeader", () => {
  it("is true when the header tree's site-header uses layout: sidebar", () => {
    expect(isSidebarHeader([{ type: "site-header", content: { layout: "sidebar" } }])).toBe(true);
  });

  it("is false for every other layout, and when there is no header at all", () => {
    expect(isSidebarHeader([{ type: "site-header", content: { layout: "spread" } }])).toBe(false);
    expect(isSidebarHeader([])).toBe(false);
    expect(isSidebarHeader([{ type: "announcement", content: {} }])).toBe(false);
  });
});
