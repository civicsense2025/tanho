import type { WxrItem } from "./parse";

/**
 * Optional per-item transform applied before mapping — the Squarespace importer
 * uses this to strip SQSP wrapper markup from `contentHtml`. Returns the
 * (possibly rewritten) item plus any issues to record. Absent → identity.
 * Lives in its own module so both the commit engine and the custom-type import
 * steps can share the type without a circular import.
 */
export type ItemPreprocessor = (item: WxrItem) => { item: WxrItem; issues: Array<{ kind: string; detail: string }> };

export const identityPreprocess: ItemPreprocessor = (item) => ({ item, issues: [] });
