import type { SamplePack, SampleMenuItem } from "./types";

/**
 * Entity base paths (index routes) that exist whenever the sample seeds at
 * least one entry of that type, plus always-on public routes. A nav href is
 * valid if it's external (http/mailto/#), a seeded page route, one of these
 * index routes, or a detail route under a base path whose entry was seeded.
 */
const ALWAYS_ROUTES = new Set(["/", "/quiz", "/book", "/account", "/newsletter"]);
const ENTITY_BASES: Record<string, string> = {
  project: "/work",
  guide: "/guides",
  hub: "/guides",
  resource: "/resources",
};

/**
 * Throw if any internal nav link would 404. This is what guarantees a sample is
 * fully explorable with no broken pages — the whole reason this framework
 * exists. External links (http/mailto/#anchor) are always allowed.
 */
export function validateNav(pack: SamplePack): void {
  const pageRoutes = new Set(pack.pages.map((p) => p.route));
  const shopSeeded = (pack.shop?.products.length ?? 0) > 0;
  const seededBases = new Set<string>();
  for (const e of pack.entries ?? []) {
    const base = ENTITY_BASES[e.type];
    if (base) seededBases.add(base);
  }
  if (shopSeeded) seededBases.add("/shop");

  const problems: string[] = [];
  const check = (item: SampleMenuItem | { label: string; href: string }) => {
    const href = item.href;
    // External / anchor links are fine.
    if (/^(https?:\/\/|mailto:|#)/.test(href)) return;
    if (!href.startsWith("/")) {
      problems.push(`"${item.label}" → ${href} (not an internal path)`);
      return;
    }
    if (ALWAYS_ROUTES.has(href) || pageRoutes.has(href)) return;
    // An index route (/work, /shop) whose content was seeded.
    if (seededBases.has(href)) return;
    // A detail route (/work/x, /shop/y) under a seeded base.
    const base = "/" + href.split("/")[1];
    if (seededBases.has(base)) return;
    problems.push(`"${item.label}" → ${href} (no seeded page or entry at this route)`);
  };

  for (const item of pack.menu) {
    check(item);
    for (const child of item.children ?? []) check(child);
  }

  if (problems.length) {
    throw new Error(
      `Sample "${pack.meta.brand}" has dangling nav links (would 404):\n  - ${problems.join(
        "\n  - ",
      )}\nEvery menu href must resolve to a seeded page, entity index, or external URL.`,
    );
  }
}
