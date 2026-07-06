import type { Importer } from "../shared/registry";
import { IssueList, StatLine } from "../shared/admin/ImportScreen";
import { dryRunGhostImport, commitGhostImport } from "./review-actions";
import type { GhostDryRunSummary } from "./map";

/**
 * Ghost importer descriptor — wraps the existing Ghost review actions into the shared
 * registry so Ghost lives in the unified Import hub alongside the others. The generic
 * <ImportScreen> collects a content JSON (required) + an optional members CSV; this
 * adapts them to the action's positional `(contentJson, membersCsv)` shape.
 */
export const ghostImporter: Importer<GhostDryRunSummary> = {
  id: "ghost",
  label: "Ghost",
  description: "Import a Ghost content export + optional members CSV — posts, members, redirects.",
  source: "ghost",
  acceptSummary: "Ghost JSON + CSV",
  inputs: [
    {
      kind: "file",
      key: "contentJson",
      label: "Ghost content export (.json)",
      hint: "Ghost admin → Settings → Advanced → Import/Export.",
      accept: ".json,application/json",
      required: true,
      read: "json",
    },
    {
      kind: "file",
      key: "membersCsv",
      label: "Ghost members export (.csv), optional",
      hint: "Ghost admin → Members → export.",
      accept: ".csv,text/csv",
      required: false,
      read: "text",
    },
  ],
  dryRun: (args) => dryRunGhostImport(args.contentJson ?? null, (args.membersCsv as string | undefined) ?? null),
  commit: (args) => commitGhostImport(args.contentJson ?? null, (args.membersCsv as string | undefined) ?? null),
  renderSummary: (s) => (
    <>
      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <StatLine>{s.postCount} post(s) to import</StatLine>
        <StatLine>
          {s.memberCount} member(s) to import ({s.payingMemberCount} paying/comp)
        </StatLine>
      </ul>
      <IssueList issues={s.issues} />
    </>
  ),
};
