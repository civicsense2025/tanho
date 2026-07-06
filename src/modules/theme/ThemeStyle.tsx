import { colorVars, declarations } from "./css-vars";
import { deriveTokens } from "./derive";
import { spaceVars, typeVars } from "./scales";
import { getTheme } from "./queries";
import { getActiveFontRender } from "@/modules/fonts/queries";
import type { ThemeInput } from "./validation";

/**
 * Builds the full themed stylesheet (light root + dark scopes). `customStack`
 * (when a custom/Google font is active) overrides `--font-sans`; it is already
 * validated by fonts/css.ts before reaching here.
 */
export function buildThemeCss(t: ThemeInput, customStack?: string | null): string {
  const bases = { accent: t.accent, accent2: t.accent2, ink: t.ink, paper: t.paper };
  const light = declarations({
    ...colorVars(deriveTokens(bases, "light")),
    ...typeVars({ ...t, customStack }),
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
 * Server component: injects the site theme as CSS variables, plus — when a
 * custom/Google font family is active — its `@font-face` rules and a preload
 * hint for the primary face. Every emitted value is derived from zod-validated
 * scalars or passes the safe-value filters (css-vars.ts / fonts/css.ts), so
 * this output contains no unvalidated input.
 */
export async function ThemeStyle() {
  const t = await getTheme();
  const font = await getActiveFontRender(t.fontFamilyId);
  return (
    <>
      {font.preloadUrl ? (
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href={font.preloadUrl}
          crossOrigin="anonymous"
        />
      ) : null}
      <style id="site-theme">{buildThemeCss(t, font.cssStack)}</style>
      {font.fontFaceCss ? <style id="site-fonts">{font.fontFaceCss}</style> : null}
    </>
  );
}
