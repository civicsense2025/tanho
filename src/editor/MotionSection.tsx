import {
  MOTION_TRIGGERS,
  MOTION_EFFECTS,
  MOTION_DURATIONS,
  MOTION_DELAYS,
  MOTION_EASINGS,
} from "@/blocks/common";
import { summaryStyle } from "./style-fields-config";
import { ControlGrid } from "./ControlGrid";

/**
 * The motion (entrance-animation) controls: a small fixed set of enum selects. Not
 * per-breakpoint — an entrance effect is one behaviour. Choosing a trigger of "none"
 * (or leaving it blank) disables the animation. Content is never hidden without JS or
 * under reduced-motion (the renderer guards that), so this is purely additive polish.
 */
export function MotionSection({
  motion,
  onSet,
}: {
  motion: Record<string, string>;
  onSet: (field: string, value: string | undefined) => void;
}) {
  const active = motion.trigger && motion.trigger !== "none";
  const controls: { field: string; label: string; options: readonly string[] }[] = [
    { field: "trigger", label: "Trigger", options: MOTION_TRIGGERS },
    { field: "effect", label: "Effect", options: MOTION_EFFECTS },
    { field: "duration", label: "Duration", options: MOTION_DURATIONS },
    { field: "delay", label: "Delay", options: MOTION_DELAYS },
    { field: "easing", label: "Easing", options: MOTION_EASINGS },
    { field: "stagger", label: "Stagger children", options: MOTION_DELAYS },
  ];
  return (
    <details open={!!active}>
      <summary style={summaryStyle}>Animation</summary>
      <div style={{ marginTop: "var(--space-2)" }}>
        <ControlGrid
          controls={controls}
          layer={motion}
          onSet={(field, v) => onSet(field, v)}
        />
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Plays on load or when scrolled into view. Respects “reduce motion”; never hides content without JS.
        </p>
      </div>
    </details>
  );
}
