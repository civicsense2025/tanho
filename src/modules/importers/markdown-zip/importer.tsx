import type { Importer } from "../shared/registry";
import { IssueList, StatLine } from "../shared/admin/ImportScreen";
import { dryRunMarkdownImport, commitMarkdownImport } from "./review-actions";
import type { MarkdownDryRunSummary } from "./map";

/**
 * Markdown-zip importer descriptor — registers the Markdown importer in the unified
 * Import hub. The generic <ImportScreen> collects one .zip file (read as an
 * arrayBuffer, i.e. the File is passed straight through to the server action) and
 * runs the shared dry-run → confirm flow. Honors YAML frontmatter
 * (title/slug/date/draft/tags/aliases) from Jekyll / Hugo / Obsidian exports.
 */
export const markdownZipImporter: Importer<MarkdownDryRunSummary> = {
  id: "markdown-zip",
  label: "Markdown / Zip",
  description: "Import a .zip of Markdown files (with optional YAML frontmatter) — Jekyll, Hugo, Obsidian.",
  source: "markdown-zip",
  acceptSummary: "Markdown ZIP",
  inputs: [
    {
      kind: "file",
      key: "file",
      label: "Markdown zip (.zip)",
      hint: "A .zip of .md files. Frontmatter title/slug/date/draft/tags/aliases are honored.",
      accept: ".zip,application/zip",
      required: true,
      read: "arrayBuffer",
    },
  ],
  dryRun: (args) => dryRunMarkdownImport(args.file as File),
  commit: (args) => commitMarkdownImport(args.file as File),
  renderSummary: (s) => (
    <>
      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <StatLine>{s.pageCount} page(s) to import</StatLine>
        <StatLine>{s.publishedCount} published</StatLine>
      </ul>
      <IssueList issues={s.issues} />
    </>
  ),
};
