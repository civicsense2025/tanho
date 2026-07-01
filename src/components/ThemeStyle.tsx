import type { ThemeConfig } from "@/config/site.config";

/**
 * Emits a per-instance :root override that re-points the semantic design tokens (--accent,
 * --accent-2, --font-sans) from ThemeConfig. Because the whole app is built on that semantic
 * token layer, overriding these re-skins everything with no component edits — the white-label
 * theming seam. Takes ThemeConfig (not siteConfig) so a future admin Theme panel can feed it
 * from the DB with no change here.
 *
 * SECURITY: values are owner-controlled build-time config, but still validated to a strict
 * shape before being interpolated into a <style>, so a malformed value can neither break out of
 * the CSS nor inject markup. Only values passing the allowlist are emitted.
 */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
// A conservative font-stack allowlist: letters, digits, spaces, commas, quotes, hyphens.
const FONT = /^[\w ,'"-]+$/;

export function ThemeStyle({ theme }: { theme: ThemeConfig }) {
  const decls: string[] = [];
  if (theme.accent && HEX.test(theme.accent)) decls.push(`--accent:${theme.accent}`);
  if (theme.accent2 && HEX.test(theme.accent2)) decls.push(`--accent-2:${theme.accent2}`);
  if (theme.font && FONT.test(theme.font)) decls.push(`--font-sans:${theme.font}`);

  if (decls.length === 0) return null;

  return <style>{`:root{${decls.join(";")}}`}</style>;
}
