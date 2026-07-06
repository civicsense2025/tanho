import type { RenderViewer } from "@/blocks/types";
import type { PaywallContent } from "@/blocks/paywall/fields";
import { hasPackEntitlement } from "@/modules/marketplace/entitlements";

/**
 * A gate someone needs to pass. Shared shape for page/post paywalls,
 * commerce pack purchases, and (later) course-lesson access — the point of
 * this module: one policy surface instead of one per feature.
 */
export type Gate =
  | { kind: "membership"; tier: string } // "" = any active member
  | { kind: "pack"; packType: "block_pack" | "design_pack"; packEntryId: string }
  | { kind: "any"; gates: Gate[] } // passes if ANY sub-gate passes
  | { kind: "all"; gates: Gate[] }; // passes if EVERY sub-gate passes

export type EntitlementResult =
  | { passed: true }
  | { passed: false; reason: "anonymous" | "wrong-tier" | "not-entitled" };

/**
 * Pure, sync — resolves membership gates (and any/all trees composed only of
 * membership gates). Used by the block walker, which must stay synchronous.
 * A "pack" gate reached here always fails closed (not-entitled): the walker
 * never awaits a DB call mid-render, so per-block pack gating isn't
 * supported inline — only resolveEntitlement (async) can check a pack.
 */
export function resolveMembershipGate(viewer: RenderViewer, gate: Gate): EntitlementResult {
  switch (gate.kind) {
    case "membership": {
      if (!viewer || !viewer.memberActive) return { passed: false, reason: "anonymous" };
      if (!gate.tier) return { passed: true };
      return viewer.tier === gate.tier ? { passed: true } : { passed: false, reason: "wrong-tier" };
    }
    case "pack":
      return { passed: false, reason: "not-entitled" };
    case "any": {
      let result: EntitlementResult = { passed: false, reason: "anonymous" };
      for (const g of gate.gates) {
        result = resolveMembershipGate(viewer, g);
        if (result.passed) return result;
      }
      return result;
    }
    case "all": {
      // An "all" gate with zero sub-gates is a vacuous truth ("require
      // nothing") — without this guard the loop below never runs and falls
      // through to passed:true for ANY viewer, including anonymous. Fail
      // closed instead: requiring nothing is not the same as granting access.
      if (gate.gates.length === 0) return { passed: false, reason: "anonymous" };
      for (const g of gate.gates) {
        const result = resolveMembershipGate(viewer, g);
        if (!result.passed) return result;
      }
      return { passed: true };
    }
  }
}

/** How much of the gated sibling list a non-passing viewer still gets to see. */
export type PreviewAllowance =
  | { passed: true }
  | { passed: false; previewBlocks: number; nudge?: string };

/**
 * Like resolveMembershipGate, but for a viewer who DOESN'T pass, reports how
 * many further sibling blocks they should still be shown (the paywall's
 * preview-depth fields) instead of a flat fail. A signed-in reader who fails
 * the gate (a "subscriber") gets `subscriberPreviewBlocks` + the nudge copy;
 * a signed-out visitor gets `anonPreviewBlocks`.
 */
export function resolvePaywallPreview(viewer: RenderViewer, content: PaywallContent): PreviewAllowance {
  const result = resolveMembershipGate(viewer, { kind: "membership", tier: content.tier });
  if (result.passed) return { passed: true };
  const isSignedInSubscriber = viewer !== null;
  return isSignedInSubscriber
    ? { passed: false, previewBlocks: content.subscriberPreviewBlocks, nudge: content.subscriberNudge || undefined }
    : { passed: false, previewBlocks: content.anonPreviewBlocks };
}

/**
 * Async — resolves any Gate shape, including "pack" (a real DB lookup via
 * hasPackEntitlement). Delegates membership sub-gates to
 * resolveMembershipGate rather than duplicating tier logic.
 */
export async function resolveEntitlement(viewer: RenderViewer, gate: Gate): Promise<EntitlementResult> {
  switch (gate.kind) {
    case "membership":
      return resolveMembershipGate(viewer, gate);
    case "pack": {
      if (!viewer) return { passed: false, reason: "anonymous" };
      const has = await hasPackEntitlement(viewer.personId, gate.packType, gate.packEntryId);
      return has ? { passed: true } : { passed: false, reason: "not-entitled" };
    }
    case "any": {
      let result: EntitlementResult = { passed: false, reason: "anonymous" };
      for (const g of gate.gates) {
        result = await resolveEntitlement(viewer, g);
        if (result.passed) return result;
      }
      return result;
    }
    case "all": {
      // See resolveMembershipGate's identical guard — an empty gates array
      // must fail closed, not vacuously pass every viewer.
      if (gate.gates.length === 0) return { passed: false, reason: "anonymous" };
      for (const g of gate.gates) {
        const result = await resolveEntitlement(viewer, g);
        if (!result.passed) return result;
      }
      return { passed: true };
    }
  }
}
