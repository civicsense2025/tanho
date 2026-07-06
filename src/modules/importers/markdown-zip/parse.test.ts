import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { parseMarkdownZip } from "./parse";

/** Build an in-memory .zip File from a { path: content } map. */
function makeZip(files: Record<string, string>): File {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
  const bytes = zipSync(entries);
  return new File([bytes], "x.zip", { type: "application/zip" });
}

describe("parseMarkdownZip", () => {
  it("parses each .md file, honoring frontmatter title/tags and draft status", async () => {
    const zip = makeZip({
      "posts/hello.md": "---\ntitle: Hello\ntags: [a, b]\n---\n# Hi\n\nBody para.",
      "draft.md": "---\ndraft: true\n---\nDraft body",
    });

    const result = await parseMarkdownZip(zip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.docs).toHaveLength(2);

    const hello = result.docs.find((d) => d.path === "posts/hello.md")!;
    expect(hello.title).toBe("Hello");
    expect(hello.tags).toEqual(["a", "b"]);
    expect(hello.status).toBe("published");
    // markdownToSafeHtml renders the body markdown to HTML.
    expect(hello.html).toMatch(/<h1|<p/);

    const draft = result.docs.find((d) => d.path === "draft.md")!;
    expect(draft.status).toBe("draft");
    // No frontmatter title → filename-derived title.
    expect(draft.title).toBe("draft");
  });

  it("rejects a zip with no markdown files", async () => {
    const zip = makeZip({ "readme.txt": "not markdown" });
    const result = await parseMarkdownZip(zip);
    expect(result.ok).toBe(false);
  });

  it("still imports a file with invalid YAML frontmatter, raising an issue", async () => {
    const zip = makeZip({
      "broken.md": "---\ntitle: [unterminated\n---\nBody",
    });
    const result = await parseMarkdownZip(zip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0]!.title).toBe("broken"); // fell back to filename
    expect(result.issues.some((i) => i.kind === "frontmatter-invalid")).toBe(true);
  });
});
