import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { CUSTOM_SCOPE_CLASS } from "@/lib/css-sanitizer";
import type { TableBackedType } from "@/modules/content-schema/queries";
import { listPublishedTypeRows } from "@/modules/content-schema/queries";
import type { ContentRow } from "@/modules/content-schema/crud";
import { getPublishedTypeTemplate } from "../queries";
import styles from "./content-pages.module.css";

/**
 * Public index (listing) page for a content type — the generalization of the
 * entity directory pages.
 *
 * Reads the owner-designed INDEX template (`type-template:index:<slug>`), which
 * carries an `entry-list` block bound to this type; it resolves + renders its
 * own rows on the server (see blocks/entry-list). When the owner has no index
 * template, a default card grid of the type's published rows is rendered, each
 * card linking to `{basePath}/{slugField}`.
 *
 * Rows are passed in by the router (it already listed them); the route delegate
 * omits them and this component lists them itself.
 */
export async function ContentTypeIndex({
  type,
  rows: providedRows,
}: {
  type: TableBackedType;
  rows?: ContentRow[];
}) {
  const template = await getPublishedTypeTemplate("index", type.slug);

  if (template.length > 0) {
    // The index template is a listing, not a single row — no {{field}} filling.
    // Its entry-list block resolves the rows; other blocks render as authored.
    return (
      <main id="top" className={CUSTOM_SCOPE_CLASS}>
        <RenderBlocks blocks={template} viewer={null} />
      </main>
    );
  }

  // ── Default index (no owner template): a card grid of published rows ─────
  const rows = providedRows ?? (await listPublishedTypeRows(type));
  const titleField = type.titleField ?? "title";
  const slugField = type.slugField ?? "slug";
  const subtitleField = type.fields
    .filter((f) => !f.hidden)
    .map((f) => f.key)
    .find((k) => k !== titleField && k !== slugField);

  return (
    <main
      id="top"
      className={CUSTOM_SCOPE_CLASS}
      style={{ maxWidth: "960px", margin: "0 auto", padding: "var(--space-12) var(--gutter)" }}
    >
      <h1 className={styles.title}>{type.pluralName || type.name}</h1>
      {rows.length === 0 ? (
        <p className={styles.empty}>Nothing here yet.</p>
      ) : (
        <div className={styles.grid}>
          {rows.map((r) => {
            const slug = String(r[slugField] ?? "");
            const title = String(r[titleField] ?? "") || slug;
            const subtitle =
              subtitleField != null && r[subtitleField] != null ? String(r[subtitleField]) : "";
            return (
              <a key={slug} href={`${type.basePath}/${slug}`} className={styles.card}>
                <span className={styles.cardTitle}>{title}</span>
                {subtitle ? <span className={styles.cardSubtitle}>{subtitle}</span> : null}
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
