"use client";

import styles from "./gridlines.module.css";

/**
 * Visual editing-guides overlay drawn above the canvas. Purely visual — every
 * layer is position:absolute + pointer-events:none, so canvas interactions are
 * unaffected and layout is untouched. The PARENT must be position:relative and
 * should carry the `pb-gridlines-host` class: block outlines are scoped to
 * `.pb-gridlines-host [data-block]` so the dashed outline can never leak onto
 * the published page (editor only).
 *
 * Three guide layers, all customizable via props:
 *  - **Column gridlines** — N equal vertical columns (default 12).
 *  - **Baseline grid** — horizontal lines every `gridSize` px (default 8),
 *    reinforcing the design system's 8px spacing grid.
 *  - **Rulers** — ticked bars along top + left; minor ticks every `gridSize`,
 *    major ticks every `gridSize * 10`.
 *  - **Block outlines** — dashed outline on every `[data-block]` (editor only).
 */
export function GridlinesOverlay({
  gridlines,
  baselineGrid,
  blockOutlines,
  rulers,
  columns = 12,
  gridSize = 8,
}: {
  gridlines: boolean;
  baselineGrid: boolean;
  blockOutlines: boolean;
  rulers: boolean;
  columns?: number;
  gridSize?: number;
}) {
  if (!gridlines && !baselineGrid && !blockOutlines && !rulers) return null;

  const majorEvery = gridSize * 10;

  return (
    <div className={styles.overlay} aria-hidden="true">
      {gridlines ? <GridLayer columns={columns} /> : null}
      {baselineGrid ? <BaselineLayer gridSize={gridSize} /> : null}
      {rulers ? (
        <>
          <div className={styles.rulerTop} style={{ "--pb-grid": `${gridSize}px`, "--pb-major": `${majorEvery}px` } as React.CSSProperties} />
          <div className={styles.rulerLeft} style={{ "--pb-grid": `${gridSize}px`, "--pb-major": `${majorEvery}px` } as React.CSSProperties} />
        </>
      ) : null}
      {blockOutlines ? <style data-pb-gridlines-style="">{OUTLINE_CSS}</style> : null}
    </div>
  );
}

/** N equal columns: a 1px accent line at each column boundary plus a faint
 *  alternating gutter tint so the column reference reads at a glance. Pure CSS
 *  (no JS measurement) — the gradient is built once from `columns`. */
function GridLayer({ columns }: { columns: number }) {
  const tint = "var(--accent-tint, color-mix(in srgb, var(--accent) 5%, transparent))";
  const w = `calc(100% / ${columns})`;
  const w2 = `calc(200% / ${columns})`;
  const background = [
    // alternating gutter tint — every other column shaded
    `repeating-linear-gradient(90deg, ${tint} 0, ${tint} ${w}, transparent ${w}, transparent ${w2})`,
    // 1px vertical line at each column boundary
    `repeating-linear-gradient(90deg, var(--accent) 0 1px, transparent 1px ${w})`,
  ].join(", ");
  return <div className={styles.grid} style={{ background }} />;
}

/** Horizontal baseline grid: a 1px line every `gridSize` px (default 8).
 *  Reinforces the design system's 8px spacing scale so authors can verify
 *  block padding/margins snap to the grid. */
function BaselineLayer({ gridSize }: { gridSize: number }) {
  const background = `repeating-linear-gradient(0deg, var(--accent) 0 1px, transparent 1px ${gridSize}px)`;
  return <div className={styles.baseline} style={{ background }} />;
}

// Scoped to the editor host so it can't reach the published page. `:not(
// [data-selected])` keeps the solid accent selection outline (canvas.module.css)
// intact on the active block.
const OUTLINE_CSS = `
.pb-gridlines-host [data-block]:not([data-selected]) {
  outline: 1px dashed color-mix(in srgb, var(--accent) 45%, transparent);
  outline-offset: 2px;
}
`;
