/** Renders a plain object as a `<script type="application/ld+json">` tag. JSON.stringify's the
 * object, then escapes <, >, and & in the serialized string before injecting it via
 * dangerouslySetInnerHTML -- mirrors the sanitizeHtml() precedent used for prose
 * dangerouslySetInnerHTML call sites elsewhere in this codebase (src/lib/sanitize.ts), just for
 * JSON-LD. Never string-concatenate raw values into the script tag; only ever pass this
 * component data that has already gone through buildMetadata()'s override/template/fallback
 * resolution chain (src/lib/seo.ts), not raw DB rows. */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
