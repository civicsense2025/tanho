import type { ReactNode } from "react";
import type { Result } from "./types";

/**
 * The importer registry — one descriptor per importer makes the admin hub and the
 * single generic <ImportScreen> fully data-driven. Adding importer #8 is "write its
 * importer.ts descriptor + append it to IMPORTERS".
 *
 * Client/server boundary: this module is imported by the client <ImportScreen>, so a
 * descriptor's `renderSummary` + metadata must carry NO server-only imports. The
 * `dryRun`/`commit` fields reference each importer's `"use server"` action exports —
 * server actions ARE callable from client components, so referencing them here is fine;
 * their server-only internals (DB, node:*, SSRF fetch) never get bundled client-side.
 */

/** One input the generic screen must collect before it can call dryRun/commit. */
export type ImporterInputSpec =
  | {
      kind: "file";
      key: string;
      label: string;
      hint?: string;
      /** `accept` attribute for the file input, e.g. ".json,application/json". */
      accept: string;
      required: boolean;
      /** How the client turns the chosen File into the server-action arg value. */
      read: "text" | "json" | "arrayBuffer";
    }
  | { kind: "url"; key: string; label: string; hint?: string; placeholder?: string; required: boolean }
  | { kind: "toggle"; key: string; label: string; hint?: string; default: boolean };

/** Renders one importer's dry-run summary (each importer's summary shape differs). */
export type SummaryRenderer<S = unknown> = (summary: S) => ReactNode;

export type Importer<S = unknown> = {
  /** Stable id — the hub route segment (/admin/content/import/<id>). */
  id: string;
  label: string;
  /** One line for the hub card. */
  description: string;
  /** The `importReceipts.source` value this importer writes (free-text column). */
  source: string;
  /** Short "accepts" chip for the hub card, e.g. "ZIP", "WordPress XML", "Feed URL". */
  acceptSummary: string;
  inputs: ImporterInputSpec[];
  /** Server action: preview only, no DB writes. Args assembled by input `key`. */
  dryRun: (args: Record<string, unknown>) => Promise<Result<S>>;
  /** Server action: writes to the DB, returns the receipt id. */
  commit: (args: Record<string, unknown>) => Promise<Result<{ receiptId: string }>>;
  /** Renders the importer-specific counts panel from the dry-run summary. */
  renderSummary: SummaryRenderer<S>;
};

// Each importer's descriptor lives in its own `importer.tsx`. Imported here and listed.
import { ghostImporter } from "../ghost/importer";
import { wordpressImporter } from "../wordpress/importer";
import { squarespaceImporter } from "../squarespace/importer";
import { substackImporter } from "../substack/importer";
import { mediumImporter } from "../medium/importer";
import { rssImporter } from "../rss/importer";
import { markdownZipImporter } from "../markdown-zip/importer";

/** THE list — hub order. An importer registers here or it isn't offered. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IMPORTERS: Importer<any>[] = [
  ghostImporter,
  wordpressImporter,
  squarespaceImporter,
  substackImporter,
  mediumImporter,
  rssImporter,
  markdownZipImporter,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getImporter(id: string): Importer<any> | null {
  return IMPORTERS.find((i) => i.id === id) ?? null;
}
