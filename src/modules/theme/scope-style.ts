import { deriveTokens, type ThemeBases } from "./derive";
import { colorVars, declarations } from "./css-vars";
import { typeVars, spaceVars } from "./scales";
import type { ThemeInput } from "./validation";
import type { CSSProperties } from "react";

/**
 * The four base colors + type/spacing scalars, serialized to an inline
 * `style` object of CSS custom properties — the same derive/colorVars/
 * typeVars/spaceVars pipeline the real ThemeStyle uses, so a scoped subtree
 * (a preview card, a demo page) renders with the exact tokens that would
 * ship. Isomorphic (no client/server directive) — safe in a Server Component.
 */
export function themeScopeStyle(theme: ThemeInput, mode: "light" | "dark"): CSSProperties {
  const bases: ThemeBases = {
    accent: theme.accent,
    accent2: theme.accent2,
    ink: theme.ink,
    paper: theme.paper,
  };
  const vars = {
    ...colorVars(deriveTokens(bases, mode)),
    ...typeVars({ font: theme.font, baseSize: theme.baseSize, headingScale: theme.headingScale, leading: theme.leading }),
    ...spaceVars({ density: theme.density, radius: theme.radius, shadow: theme.shadow }),
  };
  return Object.fromEntries(
    declarations(vars)
      .split(";")
      .filter(Boolean)
      .map((d) => {
        const [k, v] = d.split(":");
        return [k, v];
      }),
  ) as CSSProperties;
}
