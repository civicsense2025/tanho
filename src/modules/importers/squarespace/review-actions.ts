"use server";

import { dryRunWxrImport, commitWxrImport, type WxrImportOptions, type WxrDryRunSummary } from "@/modules/importers/wxr/commit";
import { squarespaceMapOptions, squarespaceItemAndOptions } from "./map";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

// NOTE: a "use server" module may ONLY export async functions — no type re-exports
// (see wordpress/review-actions.ts). Consumers import WxrDryRunSummary from wxr/commit.

/**
 * Preview a Squarespace WXR import — parse + map only, no DB writes. Uses the
 * Squarespace card detector and pre-cleans SQSP wrapper markup per item.
 */
export async function dryRunSquarespaceImport(
  xml: string,
  options: WxrImportOptions,
): Promise<Result<WxrDryRunSummary>> {
  return dryRunWxrImport(xml, options, squarespaceMapOptions, squarespaceItemAndOptions);
}

/**
 * Commit a Squarespace WXR import: pages/posts + authors + (optionally)
 * comments and custom post types, with a safety receipt. Idempotent on re-runs.
 */
export async function commitSquarespaceImport(
  xml: string,
  options: WxrImportOptions,
): Promise<Result<{ receiptId: string }>> {
  return commitWxrImport(xml, options, squarespaceMapOptions, "squarespace", squarespaceItemAndOptions);
}
