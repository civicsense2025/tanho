import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { AwardItem } from "@/modules/profile/schema";
import type { AwardListContent } from "./fields";
import styles from "../profile-section.module.css";

/** Awards: title (medium) + org/year (muted), with a 5px dot in tone colour. */
export function RenderAwardList({
  content,
  ctx,
}: {
  content: AwardListContent & { _resolved?: AwardItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Awards", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const items = content._resolved;
  if (!items || items.length === 0) return null;

  return (
    <div>
      {content.eyebrow ? <div className={styles.eyebrow}>{content.eyebrow}</div> : null}
      <div className={styles.rows}>
        {items.map((item, i) => {
          const dotColor = item.tone === "accent2" ? "var(--accent-2)" : "var(--accent)";
          const meta = [item.org, item.year].filter(Boolean).join(" · ");
          return (
            <div key={i} className={styles.award}>
              <span className={styles.dot} style={{ background: dotColor }} />
              <span className={styles.awardTitle}>{item.title}</span>
              {meta ? <span className={styles.awardMeta}>{meta}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
