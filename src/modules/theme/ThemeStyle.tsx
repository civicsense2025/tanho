import { colorVars, declarations } from "./css-vars";
import { deriveTokens } from "./derive";
import { spaceVars, typeVars } from "./scales";
import { getTheme } from "./queries";
import type { ThemeInput } from "./validation";

/** Builds the full themed stylesheet (light root + dark scopes). */
export function buildThemeCss(t: ThemeInput): string {
  const bases = { accent: t.accent, accent2: t.accent2, ink: t.ink, paper: t.paper };
  const light = declarations({
    ...colorVars(deriveTokens(bases, "light")),
    ...typeVars(t),
    ...spaceVars(t),
  });
  const dark = declarations(colorVars(deriveTokens(bases, "dark")));
  return [
    `:root{${light}}`,
    `[data-theme="dark"]{${dark}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}`,
  ].join("\n");
}

/**
 * Server component: injects the site theme as CSS variables. Values are
 * derived from zod-validated scalars and pass the safe-value filter in
 * css-vars.ts, so this string contains no unvalidated input.
 */
export async function ThemeStyle() {
  const t = await getTheme();
  return <style id="site-theme">{buildThemeCss(t)}</style>;
}
