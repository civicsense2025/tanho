import type { RenderCtx } from "../types";
import type { MarqueeContent } from "./fields";
import styles from "./marquee.module.css";

const DURATION: Record<MarqueeContent["speed"], string> = {
  slow: "40s",
  normal: "24s",
  fast: "12s",
};

/**
 * A looping ticker of short text items. Two copies of the track scroll as one and
 * wrap seamlessly (see marquee.module.css). No JS; pauses under reduced-motion, and
 * optionally on hover. Reversing = the CSS animation-direction.
 */
export function RenderMarquee({ content }: { content: MarqueeContent; ctx: RenderCtx }) {
  const { items, direction, speed, pauseOnHover } = content;
  if (items.length === 0) return null;

  const row = (ariaHidden: boolean) => (
    <div className={styles.track} aria-hidden={ariaHidden || undefined}>
      {items.map((it, i) => (
        <span key={i} className={styles.item}>
          {it}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={styles.viewport}
      data-pause={pauseOnHover ? "1" : "0"}
      style={{
        // custom props consumed by the module CSS
        ["--marquee-duration" as never]: DURATION[speed],
        ["--marquee-direction" as never]: direction === "right" ? "reverse" : "normal",
      }}
    >
      {/* Wrapper is inline-flex; the two tracks sit side by side and translate as a pair. */}
      <div style={{ display: "inline-flex" }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
