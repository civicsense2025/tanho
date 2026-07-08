import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { CUSTOM_SCOPE_CLASS } from "@/lib/css-sanitizer";
import type { TableBackedType } from "@/modules/content-schema/queries";
import { getPublishedTypeRow } from "@/modules/content-schema/queries";
import type { ContentRow } from "@/modules/content-schema/crud";
import { getPublishedTypeTemplate, getPublishedRowBlocks } from "../queries";
import { fillBlockTree } from "../templating";
import styles from "./content-pages.module.css";

/**
 * Public detail page for one published row of a content type — the
 * generalization of entries/public/ProjectDetail.tsx.
 *
 * Reads the row (by slug) and the owner-designed DETAIL template
 * (`type-template:detail:<slug>`), fills every `{{field}}` token in the
 * template's text from the row, then renders via the same
 * visibleBlocksFor → buildOutline → RenderBlocks path pages/entries use (so
 * paywall gating + the TOC/anchor machinery work identically). When the owner
 * has no detail template, a default layout (title + the row's own field values)
 * is rendered instead.
 *
 * `params.slug` is awaited by the caller; if the row doesn't exist the caller
 * (route/router) is responsible for `notFound()`. Passing `row` directly is
 * supported for the router path, which already fetched it.
 */
export async function ContentTypeDetail({
  type,
  rowSlug,
  row: providedRow,
}: {
  type: TableBackedType;
  rowSlug?: string;
  row?: ContentRow;
}) {
  const row = providedRow ?? (rowSlug ? await getPublishedTypeRow(type, rowSlug) : null);
  if (!row) return null;

  const fieldLabels = new Map(type.fields.map((f) => [f.key, f.label]));

  /** Shared render for a block tree bound to THIS row (field blocks get row data via
   *  fillBlockTree). Outline built from the anon-visible cut so a TOC can't leak gated
   *  titles; RenderBlocks re-does the real paywall gate. */
  const renderTree = (tree: Parameters<typeof fillBlockTree>[0]) => {
    const blocks = fillBlockTree(tree, row, fieldLabels);
    return (
      <article className={`${CUSTOM_SCOPE_CLASS} ${styles.page}`}>
        <RenderBlocks blocks={blocks} viewer={null} />
      </article>
    );
  };

  // 1) HIGHEST PRIORITY — this row's OWN bespoke block layout (built in the block editor).
  const rowId = typeof row.id === "string" ? row.id : "";
  if (rowId) {
    const ownBlocks = await getPublishedRowBlocks(type.slug, rowId);
    if (ownBlocks.length > 0) return renderTree(ownBlocks);
  }

  // 2) The type's shared detail template ({{field}} tokens filled per row).
  const template = await getPublishedTypeTemplate("detail", type.slug);
  if (template.length > 0) return renderTree(template);

  // ── Default detail (no owner template) ──────────────────────────────────
  const titleField = type.titleField ?? "title";
  const slugField = type.slugField ?? "slug";
  const title = String(row[titleField] ?? "") || String(row[slugField] ?? "");
  // Hidden fields stay as real columns but never render publicly (e.g. an internal cost).
  const showFields = type.fields.filter(
    (f) => f.key !== titleField && f.key !== slugField && !f.hidden,
  );

  return (
    <article className={`${CUSTOM_SCOPE_CLASS} ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
      </header>
      {showFields.length > 0 ? (
        <dl className={styles.fields}>
          {showFields.map((f) => {
            const value = row[f.key];
            if (value == null || value === "") return null;
            return (
              <div key={f.key} className={styles.fieldRow}>
                <dt className={styles.fieldLabel}>{f.label}</dt>
                <dd className={styles.fieldValue}>{String(value)}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </article>
  );
}
