import type { Importer } from "../shared/registry";
import { IssueList, StatLine } from "../shared/admin/ImportScreen";
import { dryRunSubstackImport, commitSubstackImport } from "./review-actions";
import type { SubstackDryRunSummary } from "./map";

/**
 * Substack importer descriptor — registers Substack in the unified Import hub.
 * The generic <ImportScreen> collects a single .zip (read as an arrayBuffer →
 * a File the server action receives directly), then runs the two-step dry-run →
 * confirm flow.
 */
export const substackImporter: Importer<SubstackDryRunSummary> = {
  id: "substack",
  label: "Substack",
  description: "Import a Substack export — posts + subscribers.",
  source: "substack",
  acceptSummary: "Substack ZIP",
  inputs: [
    {
      kind: "file",
      key: "file",
      label: "Substack export (.zip)",
      hint: "Substack → Settings → Export. Includes posts + subscriber list.",
      accept: ".zip,application/zip",
      required: true,
      read: "arrayBuffer",
    },
  ],
  dryRun: (args) => dryRunSubstackImport(args.file as File),
  commit: (args) => commitSubstackImport(args.file as File),
  renderSummary: (s) => (
    <>
      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <StatLine>{s.postCount} post(s) to import</StatLine>
        <StatLine>
          {s.subscriberCount} subscriber(s) to import ({s.paidCount} paid)
        </StatLine>
      </ul>
      <IssueList issues={s.issues} />
    </>
  ),
};
