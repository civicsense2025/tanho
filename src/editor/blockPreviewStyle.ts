import { resolveStyleLayer, styleToCss, hasStyle, serializeVars } from "@/blocks/renderer/style";
import { resolveLayoutLayer, layoutToVars, layoutBaseDecls, layoutIsGrid, hasAnyLayout } from "@/blocks/renderer/layout-style";
import { blockTargetClass } from "@/lib/css-sanitizer";
import type { BlockStyle, BlockLayout } from "@/blocks/common";
import type { Device } from "@/blocks/types";
import type { CSSProperties } from "react";

/**
 * Single-device wrapper props for the editor's live canvas/preview (CanvasBlock,
 * PreviewBlocks) — the CLIENT-SIDE twin of BlockRenderer's per-block wrapper.
 * The public page can't branch on device (one HTML document serves every
 * viewport, so style/layout ship as real multi-breakpoint CSS — see
 * BlockRenderer.tsx's buildStyleCss/buildLayoutCss), but the editor DOES know
 * the single device currently toggled, so it resolves straight to that one
 * layer instead: an inline `style` object for the inner-box style layer
 * (styleToCss), and a scoped <style> consuming --pbl-* custom properties for
 * the advanced layout layer (mirrors buildLayoutCss minus the @media blocks).
 *
 * Without this, editing Style/Layout panel fields produces ZERO visible change
 * on the canvas — an author could set breakpoint overrides they can never see
 * until they load the actual published page.
 */
export function resolveBlockPreviewWrapper(
  blockId: string,
  content: { style?: BlockStyle; layout?: BlockLayout },
  device: Device,
): { className: string | undefined; style: CSSProperties | undefined; layoutCss: string } {
  const styleLayer = resolveStyleLayer(content.style, device);
  const style = hasStyle(styleLayer) ? styleToCss(styleLayer) : undefined;

  const layout = content.layout;
  if (!hasAnyLayout(layout)) {
    return { className: undefined, style, layoutCss: "" };
  }
  const cls = blockTargetClass(blockId);
  const layoutLayer = resolveLayoutLayer(layout, device);
  const isGrid = layoutIsGrid(layout);
  const varDecls = serializeVars(layoutToVars(layoutLayer));
  const layoutCss = `.${cls}{${varDecls ? varDecls + ";" : ""}${layoutBaseDecls(isGrid)}}`;
  return { className: cls, style, layoutCss };
}
