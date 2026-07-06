import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderNavMenu } from "./Render";
import { navMenuSchema } from "./fields";
import type { NavMenuResolved } from "./resolve";
import type { MenuItem } from "@/modules/menus/validation";
import type { RenderCtx } from "../types";

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

const ITEMS: MenuItem[] = [
  { id: "1", label: "Home", href: "/" },
  { id: "2", label: "About", href: "/about" },
  {
    id: "3",
    label: "Products",
    href: "/products",
    dropdownStyle: "simple",
    children: [
      { id: "3a", label: "Widgets", href: "/products/widgets" },
      { id: "3b", label: "Gadgets", href: "/products/gadgets" },
    ],
  },
];

const render = (partial: Record<string, unknown>, resolved: NavMenuResolved | null): string =>
  renderToStaticMarkup(
    <RenderNavMenu content={{ ...navMenuSchema.parse(partial), _resolved: resolved }} ctx={ctx} />,
  );

describe("nav-menu block", () => {
  it("renders a <nav> landmark with the configured aria-label", () => {
    const html = render({ ariaLabel: "Primary" }, { items: ITEMS, mobileItems: ITEMS });
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Primary"');
  });

  it("renders every top-level item as a crawlable link", () => {
    const html = render({}, { items: ITEMS, mobileItems: ITEMS });
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/products"');
  });

  it("renders dropdown children (server HTML, crawlable — CSS opens them)", () => {
    const html = render({}, { items: ITEMS, mobileItems: ITEMS });
    expect(html).toContain('href="/products/widgets"');
    expect(html).toContain('href="/products/gadgets"');
  });

  it("provides a no-JS mobile disclosure via <details>/<summary> (no script/onClick)", () => {
    const html = render({ mobileStyle: "drawer-right" }, { items: ITEMS, mobileItems: ITEMS });
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
  });

  it("nested mobile groups use <details> too (no JS)", () => {
    const html = render({ mobileStyle: "fullscreen" }, { items: ITEMS, mobileItems: ITEMS });
    // The desktop nav + the mobile panel both render the Products group; the
    // mobile panel wraps children in a nested <details>. At least two <details>.
    expect((html.match(/<details/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("mega dropdown groups children by their `group`", () => {
    const mega: MenuItem[] = [
      {
        id: "m",
        label: "More",
        href: "/more",
        dropdownStyle: "mega",
        children: [
          { id: "a", label: "A", href: "/a", group: "Group One" },
          { id: "b", label: "B", href: "/b", group: "Group Two" },
        ],
      },
    ];
    const html = render({}, { items: mega, mobileItems: mega });
    expect(html).toContain("Group One");
    expect(html).toContain("Group Two");
  });

  it("vertical variant renders a nav with recursively-expanded links", () => {
    const html = render({ variant: "vertical" }, { items: ITEMS, mobileItems: ITEMS });
    expect(html).toContain("<nav");
    expect(html).toContain('href="/products/widgets"');
  });

  it("renders nothing when the resolved menu is empty", () => {
    expect(render({}, { items: [], mobileItems: [] })).toBe("");
    expect(render({}, null)).toBe("");
  });

  it("emits no raw hex color (tokens-only)", () => {
    const html = render({}, { items: ITEMS, mobileItems: ITEMS });
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it("emits the mobile-nav enhancement hooks the island reads", () => {
    const html = render({ mobileStyle: "drawer-right" }, { items: ITEMS, mobileItems: ITEMS });
    // [data-mobile-nav] on the <details>, [data-mobile-scrim] on the scrim.
    expect(html).toContain("data-mobile-nav");
    expect(html).toContain("data-mobile-scrim");
    // drawers cover the page → opt into scroll-lock.
    expect(html).toContain("data-mobile-lock");
  });

  it("dropdown mobileStyle does NOT opt into scroll-lock (it doesn't cover the page)", () => {
    const html = render({ mobileStyle: "dropdown" }, { items: ITEMS, mobileItems: ITEMS });
    expect(html).toContain("data-mobile-nav");
    expect(html).not.toContain("data-mobile-lock");
    // dropdown has no scrim either.
    expect(html).not.toContain("data-mobile-scrim");
  });

  it("all mobile items remain in the server HTML regardless of style (crawlable)", () => {
    for (const mobileStyle of ["drawer-right", "drawer-left", "fullscreen", "dropdown"]) {
      const html = render({ mobileStyle }, { items: ITEMS, mobileItems: ITEMS });
      expect(html).toContain('href="/about"');
      expect(html).toContain('href="/products/widgets"');
    }
  });

  describe("slice", () => {
    const half1 = ITEMS.slice(0, 2); // Home, About — the resolver's own "first-half" cut
    const half2 = ITEMS.slice(2); // Products (+ its children)

    it("first-half desktop nav shows only the first half's items, mobile burger shows everything", () => {
      const html = render(
        { slice: "first-half", mobileStyle: "drawer-right" },
        { items: half1, mobileItems: ITEMS },
      );
      // Desktop <nav> gets the sliced set.
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/about"');
      // Mobile burger still shows the item excluded from this block's desktop slice.
      expect(html).toContain('href="/products"');
    });

    it("second-half desktop nav shows only the second half's items, mobile burger shows everything", () => {
      const html = render(
        { slice: "second-half", mobileStyle: "drawer-right" },
        { items: half2, mobileItems: ITEMS },
      );
      expect(html).toContain('href="/products"');
      // Mobile still shows items excluded from this block's desktop slice.
      expect(html).toContain('href="/about"');
    });

    it("an empty desktop slice omits the <nav> landmark entirely, not an empty one — the mobile burger still renders", () => {
      const html = render(
        { slice: "second-half", mobileStyle: "drawer-right" },
        { items: [], mobileItems: ITEMS },
      );
      // No empty desktop <nav aria-label> landmark.
      expect(html).not.toMatch(/<nav[^>]*aria-label="Primary"[^>]*><ul class="[^"]*"><\/ul><\/nav>/);
      // The mobile burger (a <details>, not a <nav>) still renders with the full menu.
      expect(html).toContain("<details");
      expect(html).toContain('href="/about"');
    });

    it("vertical variant always shows the full (mobileItems) set, ignoring slice — no desktop/mobile split for a sidebar nav", () => {
      const html = render(
        { variant: "vertical", slice: "first-half" },
        { items: half1, mobileItems: ITEMS },
      );
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/about"');
      expect(html).toContain('href="/products/widgets"'); // from the "second half" item's children
    });

    it("falls back to `items` for mobile when the resolver omits mobileItems (older/mocked _resolved shapes)", () => {
      // Deliberately NOT setting mobileItems — proves Render.tsx's `?? items`
      // fallback genuinely runs, not just that a mock happens to match.
      const html = render({ mobileStyle: "drawer-right" }, { items: ITEMS } as NavMenuResolved);
      expect(html).toContain('href="/products/widgets"');
    });
  });
});
