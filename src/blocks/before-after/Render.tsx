import type { RenderCtx } from "../types";
import type { BeforeAfterContent } from "./fields";
import styles from "./before-after.module.css";

/**
 * A draggable before/after image comparison. The "after" image is the base; the
 * "before" is clipped to a divider position an accessible range input controls
 * (keyboard + touch + pointer). The island (blocks/client/enhancements) mirrors the
 * range value onto `--ba-pos`; with no JS the range's default value still sets a static
 * split via the inline custom property, so it degrades gracefully.
 */
export function RenderBeforeAfter({ content }: { content: BeforeAfterContent; ctx: RenderCtx }) {
  const { beforeSrc, afterSrc, beforeAlt, afterAlt, beforeLabel, afterLabel, orientation, start } = content;

  if (!beforeSrc || !afterSrc) {
    return <div className={styles.placeholder}>Add a before and after image</div>;
  }

  return (
    <div
      className={styles.wrap}
      data-before-after=""
      data-axis={orientation}
      style={{ ["--ba-pos" as never]: `${start}%` }}
    >
      {/* base = after */}
      <img className={styles.img} src={afterSrc} alt={afterAlt} loading="lazy" draggable={false} />
      {/* overlay = before, clipped */}
      <img className={styles.before} src={beforeSrc} alt={beforeAlt} loading="lazy" draggable={false} />

      {beforeLabel ? <span className={`${styles.label} ${styles.labelBefore}`}>{beforeLabel}</span> : null}
      {afterLabel ? <span className={`${styles.label} ${styles.labelAfter}`}>{afterLabel}</span> : null}

      <span className={styles.divider} aria-hidden />
      <span className={styles.handle} aria-hidden>
        {orientation === "vertical" ? "↕" : "↔"}
      </span>

      <input
        className={styles.range}
        type="range"
        min={0}
        max={100}
        defaultValue={start}
        aria-label={`Reveal ${beforeLabel || "before"} vs ${afterLabel || "after"}`}
        data-before-after-range=""
      />
    </div>
  );
}
