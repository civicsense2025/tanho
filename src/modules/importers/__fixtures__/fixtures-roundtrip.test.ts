/**
 * Round-trip coverage for the realistic per-platform fixtures in this folder.
 *
 * Each importer's `dryRun` is run against its faithful fixture (a multi-item
 * export using that platform's real markup) and we assert (a) the expected item
 * counts, and (b) that every DELIBERATELY-malformed item in a fixture surfaces
 * as a parse issue — proving the importer degrades gracefully instead of
 * silently dropping content. This is the "does it handle a realistic export,
 * not just a one-line snippet" guarantee.
 *
 * `dryRun` writes nothing, so no DB is needed — only the owner guard + cache are
 * mocked (mirroring every importer's own review-actions.test.ts).
 */
import { describe, expect, it, vi } from "vitest";

const owner = { id: "u1", email: "owner@example.com", name: "Owner", role: "owner" as const };
vi.mock("@/modules/auth/guards", () => ({ requireUser: vi.fn(async () => owner) }));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});

import { ghostExportJson, ghostMembersCsv } from "./ghost";
import { wordpressWxr } from "./wordpress";
import { squarespaceWxr } from "./squarespace";
import { substackZip } from "./substack";
import { mediumZip } from "./medium";
import { rss2Feed, atomFeed } from "./rss";
import { markdownZip } from "./markdown-zip";

/** Assert a dryRun Result is ok and return its summary. */
function ok<T>(r: { ok: true; data?: T } | { ok: false; error: string }): T {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}
const kinds = (issues: Array<{ kind: string }>) => issues.map((i) => i.kind);

describe("Ghost fixture", () => {
  it("imports 5 valid posts + 4 members and flags the slug-less post", async () => {
    const { dryRunGhostImport } = await import("../ghost/review-actions");
    const s = ok(await dryRunGhostImport(JSON.parse(ghostExportJson()), ghostMembersCsv()));
    // 6 posts in the fixture, 1 malformed (no slug) → 5 importable.
    expect(s.postCount).toBe(5);
    // 4 CSV rows; the paid/complimentary one is the paying member.
    expect(s.memberCount).toBeGreaterThanOrEqual(3);
    expect(s.payingMemberCount).toBeGreaterThanOrEqual(1);
    expect(kinds(s.issues)).toContain("malformed-post");
  });
});

describe("WordPress fixture", () => {
  it("imports posts + page + CPT + attachment + comments", async () => {
    const { dryRunWordpressImport } = await import("../wordpress/review-actions");
    const s = ok(
      await dryRunWordpressImport(wordpressWxr(), { importComments: true, importCustomPostTypes: true }),
    );
    expect(s.postCount).toBe(3); // 2 published + 1 draft, all wp:post_type=post
    expect(s.pageCount).toBeGreaterThanOrEqual(1);
    expect(s.authorCount).toBe(2);
    expect(s.commentCount).toBe(2); // threaded parent + reply
    expect(s.attachmentCount).toBe(1);
    expect(s.detectedCpts.map((c) => c.type)).toContain("book");
  });
});

describe("Squarespace fixture", () => {
  it("imports SQSP posts + page (with lazy data-src images)", async () => {
    const { dryRunSquarespaceImport } = await import("../squarespace/review-actions");
    const s = ok(
      await dryRunSquarespaceImport(squarespaceWxr(), { importComments: false, importCustomPostTypes: false }),
    );
    expect(s.postCount).toBe(2);
    expect(s.pageCount).toBeGreaterThanOrEqual(1);
    expect(s.authorCount).toBe(1);
  });
});

describe("Substack fixture", () => {
  it("imports posts + subscribers and counts the paid one", async () => {
    const { dryRunSubstackImport } = await import("../substack/review-actions");
    const s = ok(await dryRunSubstackImport(substackZip()));
    expect(s.postCount).toBe(3);
    expect(s.subscriberCount).toBe(2);
    expect(s.paidCount).toBe(1); // active_subscription=true → member
  });
});

describe("Medium fixture", () => {
  it("imports stories and distinguishes the draft", async () => {
    const { dryRunMediumImport } = await import("../medium/review-actions");
    const s = ok(await dryRunMediumImport(mediumZip()));
    expect(s.postCount).toBe(3);
    expect(s.publishedCount).toBe(2); // one is draft_ prefixed
  });
});

describe("RSS/Atom fixtures", () => {
  it("imports RSS 2.0 items and skips the empty one", async () => {
    const { dryRunRssImport } = await import("../rss/review-actions");
    const s = ok(await dryRunRssImport({ xml: rss2Feed() }));
    expect(s.itemCount).toBe(2); // 3 items, 1 empty → skipped
    expect(kinds(s.issues)).toContain("malformed-item");
  });

  it("imports Atom entries (alternate-rel permalink)", async () => {
    const { dryRunRssImport } = await import("../rss/review-actions");
    const s = ok(await dryRunRssImport({ xml: atomFeed() }));
    expect(s.itemCount).toBe(2);
  });
});

describe("Markdown-zip fixture", () => {
  it("imports docs, flags broken YAML, counts drafts", async () => {
    const { dryRunMarkdownImport } = await import("../markdown-zip/review-actions");
    const s = ok(await dryRunMarkdownImport(markdownZip()));
    expect(s.pageCount).toBe(5); // 5 .md files, all importable (broken YAML still imports)
    expect(s.publishedCount).toBe(4); // one is draft: true
    expect(kinds(s.issues)).toContain("frontmatter-invalid");
  });
});
