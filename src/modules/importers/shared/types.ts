/**
 * Canonical types shared by every content importer. Each importer's own
 * `parse`/`map`/`card-detect` modules re-export or alias to these so a bug fixed
 * here is fixed everywhere, and the shared `htmlToBlocks` engine + registry speak
 * one vocabulary. These are all structural, so aliasing an importer's existing
 * `DetectedBlock`/`CardResult`/`ParseIssue` to them is a zero-runtime change.
 */

/** A non-fatal problem surfaced during an import (shown in the receipt, never thrown). */
export type ParseIssue = { kind: string; detail: string };

/** The `{ ok }` envelope every importer server action returns. */
export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** A block node an importer emits — validated on save by modules/pages/blocks-io. */
export type ImportedBlock = { id: string; type: string; content: Record<string, unknown> };

/** A recognized non-richtext block (e.g. image/gallery/embed) plus extraction issues. */
export type DetectedBlock = { type: string; content: Record<string, unknown> };
export type CardResult = { block: DetectedBlock; issues: ParseIssue[] };

/**
 * A per-provider element→block detector: given one top-level HTML element, return
 * its native OYS block, or `null` to fall through to richtext. Async because an
 * embed path may make a network call (oEmbed). Every importer supplies one.
 */
export type CardDetector = (elementHtml: string) => Promise<CardResult | null>;
