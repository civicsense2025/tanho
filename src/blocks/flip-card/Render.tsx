import type { RenderCtx } from "../types";
import type { FlipCardContent } from "./fields";
import styles from "./flip-card.module.css";

const MIN_H: Record<FlipCardContent["minHeight"], string> = {
  sm: "180px",
  md: "240px",
  lg: "320px",
};

/**
 * A two-faced card that flips on hover, or on tap/keyboard focus (touch-friendly).
 * Pure CSS 3D transform (see flip-card.module.css); the flip axis picks the rotation.
 * For the tap trigger the whole card is a <button> so it's focusable and announces state.
 */
export function RenderFlipCard({ content }: { content: FlipCardContent; ctx: RenderCtx }) {
  const { frontTitle, frontText, backTitle, backText, axis, trigger, minHeight } = content;
  const rotate = axis === "vertical" ? "rotateX(180deg)" : "rotateY(180deg)";

  const face = (title: string, text: string, back: boolean) => (
    <div className={`${styles.face} ${back ? styles.back : styles.front}`}>
      {title ? <div className={styles.title}>{title}</div> : null}
      {text ? <div className={styles.text}>{text}</div> : null}
      {!back && trigger === "hover" ? <span className={styles.hint}>Hover</span> : null}
    </div>
  );

  return (
    <div
      className={styles.scene}
      data-trigger={trigger}
      style={{ minHeight: MIN_H[minHeight], ["--flip-transform" as never]: rotate }}
    >
      {trigger === "tap" ? (
        // A real button so tap + keyboard flip it and it's announced. Faces are decorative
        // relative to the button's own accessible name (front title).
        <button
          type="button"
          aria-label={`${frontTitle || "Card"} — activate to flip`}
          style={{
            all: "unset",
            display: "block",
            width: "100%",
            height: "100%",
            minHeight: MIN_H[minHeight],
            cursor: "pointer",
          }}
        >
          <div className={styles.card} style={{ minHeight: MIN_H[minHeight] }}>
            {face(frontTitle, frontText, false)}
            {face(backTitle, backText, true)}
          </div>
        </button>
      ) : (
        <div className={styles.card} style={{ minHeight: MIN_H[minHeight] }}>
          {face(frontTitle, frontText, false)}
          {face(backTitle, backText, true)}
        </div>
      )}
    </div>
  );
}
