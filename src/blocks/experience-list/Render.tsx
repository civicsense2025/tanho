import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { ExperienceItem } from "@/modules/profile/schema";
import type { ExperienceListContent } from "./fields";
import styles from "../profile-section.module.css";

/** Experience rows: span (mono) | role + org, with an optional note. */
export function RenderExperienceList({
  content,
  ctx,
}: {
  content: ExperienceListContent & { _resolved?: ExperienceItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Experience", content._resolved);
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
              <span className={styles.role}>{item.role}</span>
              {item.org ? <span className={styles.org}> · {item.org}</span> : null}
              {item.note ? <span className={styles.note}>{item.note}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
