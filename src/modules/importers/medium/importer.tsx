import type { Importer } from "../shared/registry";
import { IssueList, StatLine } from "../shared/admin/ImportScreen";
import { dryRunMediumImport, commitMediumImport } from "./review-actions";
import type { MediumDryRunSummary } from "./map";

/**
 * Medium importer descriptor — registers the Medium importer in the unified
 * Import hub. The generic <ImportScreen> collects one .zip file (read as an
 * arrayBuffer, i.e. the File is passed straight through to the server action)
 * and runs the shared dry-run → confirm flow. Imports each Medium story as an
 * OYS post, preserving images, pullquotes, embeds, and a 301 from the story's
 * old Medium URL.
 */
export const mediumImporter: Importer<MediumDryRunSummary> = {
  id: "medium",
  label: "Medium",
  description: "Import a Medium export (.zip of your stories).",
  source: "medium",
  acceptSummary: "Medium ZIP",
  inputs: [
    {
      kind: "file",
      key: "file",
      label: "Medium export (.zip)",
      hint: "Medium → Settings → Download your information.",
      accept: ".zip,application/zip",
      required: true,
      read: "arrayBuffer",
    },
  ],
  dryRun: (args) => dryRunMediumImport(args.file as File),
  commit: (args) => commitMediumImport(args.file as File),
  renderSummary: (s) => (
    <>
      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <StatLine>{s.postCount} post(s) to import</StatLine>
        <StatLine>{s.publishedCount} published</StatLine>
      </ul>
      <IssueList issues={s.issues} />
    </>
  ),
};
