import {
  type BlockMotion,
  type MOTION_EFFECTS,
  type MOTION_DURATIONS,
  type MOTION_DELAYS,
  type MOTION_EASINGS,
} from "../common";

/**
 * The motion layer's render twin (sibling of style.ts / layout-style.ts). Turns a
 * block's `motion` enums into a scoped, GUARDED entrance animation:
 *
 *  - The wrapper carries `data-motion` + `data-motion-trigger` (+ optional
 *    `data-motion-stagger`); the client island (blocks/client/enhancements) adds
 *    `data-motion-in` on load / when it scrolls into view, which flips the element from
 *    its initial hidden state to its final state, animating via the emitted transition.
 *  - The FINAL (visible) state is the element's natural state — so with NO JS and under
 *    `prefers-reduced-motion` the element is simply shown, never stuck hidden. The
 *    initial hidden state is applied ONLY when JS booted (`html[data-blocks-enhanced]`)
 *    AND motion is not reduced.
 *
 * Every value here is a keyword / bounded number / var(--token) — no free text, so this
 * is safe by construction like the other token layers (still safe-value filtered downstream).
 */

type Effect = (typeof MOTION_EFFECTS)[number];
type Duration = (typeof MOTION_DURATIONS)[number];
type Delay = (typeof MOTION_DELAYS)[number];
type Easing = (typeof MOTION_EASINGS)[number];

const DURATION_MS: Record<Duration, string> = {
  fast: "220ms",
  base: "420ms",
  slow: "700ms",
  slower: "1000ms",
};
const DELAY_MS: Record<Delay, string> = {
  "0": "0ms",
  short: "80ms",
  medium: "160ms",
  long: "300ms",
};
const EASING_FN: Record<Easing, string> = {
  ease: "ease",
  "ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/** The INITIAL (hidden) transform+opacity per effect. The final state is always
 *  opacity:1 / no transform / no blur (the element's natural state). */
const INITIAL: Record<Effect, string> = {
  fade: "opacity:0",
  "fade-up": "opacity:0;transform:translateY(16px)",
  "fade-down": "opacity:0;transform:translateY(-16px)",
  "fade-left": "opacity:0;transform:translateX(16px)",
  "fade-right": "opacity:0;transform:translateX(-16px)",
  scale: "opacity:0;transform:scale(0.94)",
  blur: "opacity:0;filter:blur(8px)",
};

/** True when a motion object actually animates (has a real trigger + effect). */
export function motionActive(motion: BlockMotion | undefined): boolean {
  return !!motion && !!motion.trigger && motion.trigger !== "none" && !!motion.effect;
}

/** The data-* attributes the wrapper needs so the client island can drive it. Returns
 *  an empty object when motion is inactive (no attributes added). */
export function motionAttrs(motion: BlockMotion | undefined): Record<string, string> {
  if (!motionActive(motion)) return {};
  const m = motion!;
  const attrs: Record<string, string> = {
    "data-motion": m.effect!,
    "data-motion-trigger": m.trigger!,
  };
  if (m.stagger && m.stagger !== "0") attrs["data-motion-stagger"] = DELAY_MS[m.stagger];
  return attrs;
}

/**
 * The scoped <style> text for a block's motion. Emits, gated behind
 * `html[data-blocks-enhanced]` and `@media (prefers-reduced-motion: no-preference)`:
 *   - the INITIAL hidden state on the block (before it enters),
 *   - a `transition` so flipping `data-motion-in` on animates to the final state.
 * Returns "" when motion is inactive.
 */
export function buildMotionCss(cls: string, motion: BlockMotion | undefined): string {
  if (!motionActive(motion)) return "";
  const m = motion!;
  const sel = `.${cls}`;
  const initial = INITIAL[m.effect!];
  const dur = DURATION_MS[m.duration ?? "base"];
  const delay = DELAY_MS[m.delay ?? "0"];
  const easing = EASING_FN[m.easing ?? "ease-out"];

  // Only hide (and thus animate) when JS is present AND motion isn't reduced. The
  // `[data-motion-in]` state resets to the natural (final) values.
  return (
    `@media (prefers-reduced-motion: no-preference){` +
    `html[data-blocks-enhanced] ${sel}{${initial};` +
    `transition:opacity ${dur} ${easing} ${delay},transform ${dur} ${easing} ${delay},filter ${dur} ${easing} ${delay}}` +
    `html[data-blocks-enhanced] ${sel}[data-motion-in]{opacity:1;transform:none;filter:none}` +
    `}`
  );
}
