"use server";

import { defaultMapOptions } from "@/modules/importers/wxr/map";
import { dryRunWxrImport, commitWxrImport, type WxrImportOptions, type WxrDryRunSummary } from "@/modules/importers/wxr/commit";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

// NOTE: a "use server" module may ONLY export async functions. Do NOT re-export types
// here — Next's Server-Actions bundler treats every export as a callable action, so a
// re-exported (erased) type becomes a missing action at runtime (build-time 500).
// Consumers import WxrDryRunSummary from wxr/commit directly.

/**
 * Preview a WordPress WXR import — parse + map only, no DB writes. Uses the
 * default (WordPress) card detector.
 */
export async function dryRunWordpressImport(
  xml: string,
  options: WxrImportOptions,
): Promise<Result<WxrDryRunSummary>> {
  return dryRunWxrImport(xml, options, defaultMapOptions);
}

/**
 * Commit a WordPress WXR import: pages/posts + authors + (optionally) comments
 * and custom post types, with a safety receipt. Idempotent on re-runs.
 */
export async function commitWordpressImport(
  xml: string,
  options: WxrImportOptions,
): Promise<Result<{ receiptId: string }>> {
  return commitWxrImport(xml, options, defaultMapOptions, "wordpress");
}
