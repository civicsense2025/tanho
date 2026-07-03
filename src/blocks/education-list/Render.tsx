import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { EducationItem } from "@/modules/profile/schema";
import type { EducationListContent } from "./fields";
import styles from "../profile-section.module.css";

/** Education rows: span (mono) | school (medium) + degree (muted). */
export function RenderEducationList({
  content,
  ctx,
}: {
  content: EducationListContent & { _resolved?: EducationItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Education", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const items = content._resolved;
  if (!items || items.length === 0) return null;

  return (
    <div>
      {content.eyebrow ? <div className={styles.eyebrow}>{content.eyebrow}</div> : null}
      <div className={styles.rows}>
        {items.map((item, i) => (
          <div key={i} className={styles.row}>
            <span className={styles.span}>{item.span}</span>
            <div>
              <span className={styles.school}>{item.school}</span>
              {item.degree ? <span className={styles.degree}> · {item.degree}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
