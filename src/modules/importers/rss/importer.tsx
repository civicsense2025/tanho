import type { Importer } from "../shared/registry";
import { IssueList, StatLine } from "../shared/admin/ImportScreen";
import { dryRunRssImport, commitRssImport } from "./review-actions";
import type { RssDryRunSummary } from "./map";

/**
 * RSS / Atom importer descriptor — registers the feed importer in the unified
 * Import hub. Uniquely among the importers it accepts EITHER a feed URL
 * (fetched server-side through the SSRF-hardened fetchFeed) OR an uploaded
 * exported .xml file. Both inputs are optional at the field level; the server
 * action requires at least one. The generic <ImportScreen> runs the shared
 * dry-run → confirm flow over whichever was provided.
 */
export const rssImporter: Importer<RssDryRunSummary> = {
  id: "rss",
  label: "RSS / Atom",
  description: "Import from any RSS or Atom feed — by URL or an uploaded XML file.",
  source: "rss",
  acceptSummary: "Feed URL / XML",
  inputs: [
    {
      kind: "url",
      key: "url",
      label: "Feed URL (https)",
      hint: "e.g. https://example.com/feed.xml — or upload a file below.",
      placeholder: "https://…",
      required: false,
    },
    {
      kind: "file",
      key: "xml",
      label: "…or an exported feed (.xml)",
      accept: ".xml,application/xml,application/rss+xml,application/atom+xml",
      required: false,
      read: "text",
    },
  ],
  dryRun: (args) => dryRunRssImport({ xml: args.xml as string | undefined, url: args.url as string | undefined }),
  commit: (args) => commitRssImport({ xml: args.xml as string | undefined, url: args.url as string | undefined }),
  renderSummary: (s) => (
    <>
      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <StatLine>{s.itemCount} item(s) to import</StatLine>
      </ul>
      <IssueList issues={s.issues} />
    </>
  ),
};
