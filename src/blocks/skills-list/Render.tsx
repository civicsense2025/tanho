import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { SkillGroup } from "@/modules/profile/schema";
import type { SkillsListContent } from "./fields";
import styles from "../profile-section.module.css";

/** Skills: each group is a mono uppercase label above a row of pill tags. */
export function RenderSkillsList({
  content,
  ctx,
}: {
  content: SkillsListContent & { _resolved?: SkillGroup[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Skills", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const groups = content._resolved;
  if (!groups || groups.length === 0) return null;

  return (
    <div>
      {content.eyebrow ? <div className={styles.eyebrow}>{content.eyebrow}</div> : null}
      <div className={styles.rows}>
        {groups.map((g, i) => (
          <div key={i} className={styles.group}>
            {g.group ? <span className={styles.groupLabel}>{g.group}</span> : null}
            <div className={styles.pills}>
              {g.items.map((item, j) => (
                <span key={j} className={styles.pill}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
