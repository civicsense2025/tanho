import type { RenderCtx } from "../types";
import type { TabsContent } from "./fields";
import styles from "./tabs.module.css";

/**
 * Tabbed content. Progressive enhancement (matches the accordion/nav philosophy):
 * with NO JS every panel is shown, each led by its label — so nothing is hidden.
 * The client island (blocks/client/enhancements) upgrades it to a real ARIA tablist:
 * shows the tab strip, hides inactive panels, wires click + arrow-key selection.
 */
export function RenderTabs({ content }: { content: TabsContent; ctx: RenderCtx }) {
  const { orientation, variant, items } = content;
  if (items.length === 0) return null;

  return (
    <div className={styles.tabs} data-tabs="" data-orientation={orientation} data-variant={variant}>
      {/* Enhanced-only tab strip. Buttons reference panels by index via data-tab-index. */}
      <div className={styles.tablist} role="tablist" aria-orientation={orientation}>
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            className={styles.tab}
            data-tab-index={String(i)}
            aria-selected={i === 0 ? "true" : "false"}
          >
            {it.label}
          </button>
        ))}
      </div>

      <div className={styles.panels}>
        {items.map((it, i) => (
          <div key={i} data-tab-panel={String(i)} role="tabpanel">
            {/* Fallback label heading (hidden once enhanced). */}
            <div className={styles.panelLabel}>{it.label}</div>
            {/* NOT `hidden` in SSR — no-JS shows every panel. The island stamps
                `hidden` on inactive panels once it boots. */}
            <div className={styles.panel}>{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
