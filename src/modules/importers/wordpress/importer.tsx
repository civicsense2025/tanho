import type { Importer } from "../shared/registry";
import { IssueList, StatLine } from "../shared/admin/ImportScreen";
import { dryRunWordpressImport, commitWordpressImport } from "./review-actions";
// Import the summary TYPE from the non-"use server" module. Re-exporting a type
// THROUGH a "use server" file (review-actions) breaks Next's Server-Actions bundler,
// which treats every export of such a module as a callable action (types are erased,
// so the "action" doesn't exist at runtime → a build-time 500). tsc can't see this.
import type { WxrDryRunSummary } from "@/modules/importers/wxr/commit";

/**
 * WordPress importer descriptor — wraps the existing (tested) WXR review actions so
 * WordPress appears in the Import hub with a working UI. The generic <ImportScreen>
 * collects `xml` (file) + two toggles; this adapts them to the action's positional
 * `(xml, { importComments, importCustomPostTypes })` shape.
 */
export const wordpressImporter: Importer<WxrDryRunSummary> = {
  id: "wordpress",
  label: "WordPress",
  description: "Import a WordPress WXR export (Tools → Export) — posts, pages, authors, comments.",
  source: "wordpress",
  acceptSummary: "WordPress XML",
  inputs: [
    {
      kind: "file",
      key: "xml",
      label: "WordPress export (.xml)",
      hint: "WordPress admin → Tools → Export → All content.",
      accept: ".xml,application/xml,text/xml",
      required: true,
      read: "text",
    },
    { kind: "toggle", key: "importComments", label: "Import comments as entries", default: false },
    { kind: "toggle", key: "importCustomPostTypes", label: "Import custom post types as entries", default: false },
  ],
  dryRun: (args) =>
    dryRunWordpressImport(String(args.xml ?? ""), {
      importComments: Boolean(args.importComments),
      importCustomPostTypes: Boolean(args.importCustomPostTypes),
    }),
  commit: (args) =>
    commitWordpressImport(String(args.xml ?? ""), {
      importComments: Boolean(args.importComments),
      importCustomPostTypes: Boolean(args.importCustomPostTypes),
    }),
  renderSummary: (s) => <WxrSummary summary={s} />,
};

/** Shared WXR summary panel (WordPress + Squarespace render identically). */
export function WxrSummary({ summary }: { summary: WxrDryRunSummary }) {
  return (
    <>
      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <StatLine>{summary.postCount} post(s) and {summary.pageCount} page(s) to import</StatLine>
        <StatLine>{summary.authorCount} author(s) → people</StatLine>
        {summary.commentCount > 0 ? <StatLine>{summary.commentCount} comment(s)</StatLine> : null}
        {summary.detectedCpts.length > 0 ? (
          <StatLine>
            {summary.detectedCpts.length} custom type(s): {summary.detectedCpts.map((c) => `${c.type} (${c.count})`).join(", ")}
          </StatLine>
        ) : null}
        {summary.attachmentCount > 0 ? <StatLine>{summary.attachmentCount} attachment(s) skipped (media not imported)</StatLine> : null}
      </ul>
      <IssueList issues={summary.issues} />
    </>
  );
}
