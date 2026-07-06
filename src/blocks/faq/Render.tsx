import { JsonLd } from "@/modules/seo/JsonLdScript";
import type { RenderCtx } from "../types";
import type { FaqContent } from "./fields";
import styles from "./faq.module.css";

/**
 * FAQ list on native <details>/<summary> (same no-JS disclosure as the accordion
 * block) PLUS a schema.org FAQPage JSON-LD payload for rich results. The JSON-LD
 * is emitted through the sanctioned <JsonLd> component (escapes `<` so a value can
 * never break out of the script tag).
 */
export function RenderFaq({ content }: { content: FaqContent; ctx: RenderCtx }) {
  const { items } = content;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      {items.map((item, i) => (
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
      <JsonLd schema={jsonLd} />
    </div>
  );
}
