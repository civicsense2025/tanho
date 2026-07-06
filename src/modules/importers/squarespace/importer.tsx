import type { Importer } from "../shared/registry";
import { WxrSummary } from "../wordpress/importer";
import { dryRunSquarespaceImport, commitSquarespaceImport } from "./review-actions";
// Type from the non-"use server" module — see the note in wordpress/importer.tsx.
import type { WxrDryRunSummary } from "@/modules/importers/wxr/commit";

/**
 * Squarespace importer descriptor — Squarespace exports the same WXR format as
 * WordPress ("Settings → Import & Export → Export → WordPress"), so this wraps the
 * SQSP-flavored WXR review actions (which pre-clean SQSP wrapper markup). Same UI +
 * summary panel as WordPress; only the card detector + source label differ.
 */
export const squarespaceImporter: Importer<WxrDryRunSummary> = {
  id: "squarespace",
  label: "Squarespace",
  description: "Import a Squarespace export (Settings → Import & Export → Export → WordPress).",
  source: "squarespace",
  acceptSummary: "Squarespace XML",
  inputs: [
    {
      kind: "file",
      key: "xml",
      label: "Squarespace export (.xml)",
      hint: "Squarespace → Settings → Import & Export → Export → WordPress format.",
      accept: ".xml,application/xml,text/xml",
      required: true,
      read: "text",
    },
    { kind: "toggle", key: "importComments", label: "Import comments as entries", default: false },
    { kind: "toggle", key: "importCustomPostTypes", label: "Import custom post types as entries", default: false },
  ],
  dryRun: (args) =>
    dryRunSquarespaceImport(String(args.xml ?? ""), {
      importComments: Boolean(args.importComments),
      importCustomPostTypes: Boolean(args.importCustomPostTypes),
    }),
  commit: (args) =>
    commitSquarespaceImport(String(args.xml ?? ""), {
      importComments: Boolean(args.importComments),
      importCustomPostTypes: Boolean(args.importCustomPostTypes),
    }),
  renderSummary: (s) => <WxrSummary summary={s} />,
};
