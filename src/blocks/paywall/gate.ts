import { resolveMembershipGate, resolvePaywallPreview } from "@/modules/entitlements/gate";
import { isContainer, kidsOf } from "../tree";
import type { BlockNode, RenderViewer } from "../types";
import { paywallSchema, type PaywallContent } from "./fields";

/**
 * Does this viewer pass the paywall? Thin adapter over the shared membership
 * gate in `modules/entitlements/gate.ts` — kept here so the walker's import
 * (`../paywall/gate`) never needs to change. Anonymous never passes; an
 * empty `tier` requires any active membership; a named tier requires that
 * exact tier (active).
 */
export function viewerPassesPaywall(
  viewer: RenderViewer,
  content: PaywallContent,
): boolean {
  return resolveMembershipGate(viewer, { kind: "membership", tier: content.tier }).passed;
}

/**
 * The subtree this viewer is allowed to SEE — the pure mirror of the walker's
 * paywall cut (BlockRenderer stops a sibling list at the first paywall the
 * viewer fails, though it may still reveal a bounded run of preview siblings
 * past the wall — see resolvePaywallPreview). Anything computed FROM the
 * tree for the public page (heading outline, TOC links, anchor maps) must be
 * derived from this, never the full tree, or it leaks gated titles and links
 * to anchors that were never rendered — INCLUDING anchors for content that's
 * only visible via preview depth, which this must include too, or the TOC
 * would omit headings the reader can actually see. Pure and non-mutating:
 * returns new arrays/nodes where truncation occurred, the original nodes
 * elsewhere.
 */
export function visibleBlocksFor(viewer: RenderViewer, blocks: BlockNode[]): BlockNode[] {
  const out: BlockNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.type === "paywall") {
      const parsed = paywallSchema.safeParse(b.content);
      const content = parsed.success ? parsed.data : paywallSchema.parse({});
      const allowance = resolvePaywallPreview(viewer, content);
      if (!allowance.passed) {
        // Same cut-plus-preview-window as the walker: a failed paywall still
        // reveals up to `previewBlocks` more siblings (0 by default) before
        // withholding the rest. The banner itself carries no gated content.
        const previewSiblings = blocks.slice(i + 1, i + 1 + allowance.previewBlocks);
        out.push(...visibleBlocksFor(viewer, previewSiblings));
        return out;
      }
      continue;
    }
    if (isContainer(b)) {
      const kids = kidsOf(b);
      const visibleKids = visibleBlocksFor(viewer, kids);
      // "Unchanged" requires element IDENTITY, not just a matching count: a
      // nested container can be internally truncated (rebuilt as a NEW node
      // with fewer grandchildren) while the direct-child count is unchanged.
      // Comparing length alone re-attaches that original, un-truncated node and
      // leaks its gated headings into the outline/TOC. Recurse-safe because
      // visibleBlocksFor returns the SAME reference for untouched subtrees.
      const unchanged =
        visibleKids.length === kids.length && visibleKids.every((k, i) => k === kids[i]);
      out.push(unchanged ? b : { ...b, content: { ...b.content, blocks: visibleKids } });
    } else {
      out.push(b);
    }
  }
  return out;
}
