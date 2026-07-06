import type { RenderCtx } from "../types";
import type { ReadingProgressContent } from "./fields";
import styles from "./reading-progress.module.css";

const POSITION: Record<string, string> = {
  top: styles.top!,
  "under-header": styles.underHeader!,
  bottom: styles.bottom!,
};

/**
 * A scroll-driven reading-progress bar. CSS-first: filled by
 * `animation-timeline: scroll()` where supported (zero JS); the shared island
 * provides a `requestAnimationFrame` fallback via `--reading-progress`
 * elsewhere. Decorative, so hidden from assistive tech.
 */
export function RenderReadingProgress({
  content,
}: {
  content: ReadingProgressContent;
  ctx: RenderCtx;
}) {
  const barClass = [styles.bar, POSITION[content.position], styles[content.thickness]]
    .filter(Boolean)
    .join(" ");
  const fillClass = [styles.fill, styles[content.color]].filter(Boolean).join(" ");
  return (
    <div className={barClass} data-reading-progress aria-hidden="true">
      <div className={fillClass} />
    </div>
  );
}
