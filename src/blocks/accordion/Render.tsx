import type { RenderCtx } from "../types";
import type { AccordionContent } from "./fields";
import styles from "./accordion.module.css";

/** Disclosure list on native <details>/<summary> — works without JS. */
export function RenderAccordion({ content }: { content: AccordionContent; ctx: RenderCtx }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      {content.items.map((item, i) => (
        <details key={i} className={styles.item} style={{ borderBottom: "1px solid var(--border)" }}>
          <summary
            className={styles.summary}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              padding: "var(--space-4) 0",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            {item.q}
          </summary>
          <div
            style={{
              padding: "0 0 var(--space-4)",
              maxWidth: "58ch",
              fontSize: "var(--text-sm)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--text-muted)",
            }}
          >
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
