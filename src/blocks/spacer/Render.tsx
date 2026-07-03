import type { RenderCtx } from "../types";
import type { SpacerContent } from "./fields";

/** Empty vertical breathing room — height in px, clamped by the schema. */
export function RenderSpacer({ content }: { content: SpacerContent; ctx: RenderCtx }) {
  return <div aria-hidden style={{ height: `${content.size}px` }} />;
}
