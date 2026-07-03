/** The four tokens a metadata template may interpolate. */
export type TemplateVars = {
  title?: string;
  excerpt?: string;
  tag?: string;
  site?: string;
};

/**
 * Fill a metadata template. Plain string substitution of the four tokens,
 * then strips `<` and `>` from the result. Output is PLAIN TEXT for
 * `<title>`/`<meta>` — never HTML — so removing angle brackets keeps
 * author- or content-supplied values from injecting markup.
 */
export function applyTemplate(tmpl: string, vars: TemplateVars): string {
  return (tmpl ?? "")
    .replaceAll("{title}", vars.title ?? "")
    .replaceAll("{excerpt}", vars.excerpt ?? "")
    .replaceAll("{tag}", vars.tag ?? "")
    .replaceAll("{site}", vars.site ?? "")
    .replaceAll("<", "")
    .replaceAll(">", "")
    .trim();
}
