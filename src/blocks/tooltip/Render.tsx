import type { RenderCtx } from "../types";
import type { TooltipContent } from "./fields";
import styles from "./tooltip.module.css";

/**
 * A hint anchored to a trigger, shown on hover AND keyboard focus. Pure CSS (no JS,
 * no per-instance id needed). The trigger is a real <button> so it's focusable and
 * carries the tip as its native `title` too, giving screen-reader + touch support
 * alongside the styled bubble.
 */
export function RenderTooltip({ content }: { content: TooltipContent; ctx: RenderCtx }) {
  const { trigger, tip, position } = content;
  if (!trigger || !tip) return null;

  return (
    <span className={styles.wrap} data-pos={position}>
      <button type="button" className={styles.trigger} title={tip}>
        {trigger}
      </button>
      <span className={styles.bubble} role="tooltip">
        {tip}
      </span>
    </span>
  );
}
