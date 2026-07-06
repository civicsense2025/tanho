import type { RenderCtx } from "../types";
import type { LottieContent } from "./fields";

const MAX_W: Record<LottieContent["maxWidth"], string> = {
  sm: "240px",
  md: "420px",
  lg: "640px",
  full: "100%",
};

/**
 * A Lottie/dotLottie animation player. The block is server-pure: it renders only a
 * mount point stamped with `data-lottie-*`; the client island dynamically imports
 * `lottie-web` and plays into it (on load or in-view, respecting reduced-motion). If the
 * customer removed the optional `lottie-web` dependency, this block is hidden from the
 * picker and skipped by the renderer (see blocks/capabilities.ts), so this Render never
 * runs without the dep. With no `src`, nothing is shown.
 */
export function RenderLottie({ content }: { content: LottieContent; ctx: RenderCtx }) {
  const { src, loop, trigger, maxWidth, alt } = content;
  if (!src) return null;

  return (
    <div
      data-lottie=""
      data-lottie-src={src}
      data-lottie-loop={loop ? "1" : "0"}
      data-lottie-trigger={trigger}
      role="img"
      aria-label={alt || undefined}
      style={{ width: "100%", maxWidth: MAX_W[maxWidth], marginInline: "auto" }}
    />
  );
}
