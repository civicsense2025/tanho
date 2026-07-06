import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { parseMedium } from "./parse";

/** Build an in-memory .zip File from a { path: content } map. */
function makeZip(files: Record<string, string>): File {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
  const bytes = zipSync(entries);
  return new File([bytes], "medium.zip", { type: "application/zip" });
}

/** A minimal Medium story export HTML. */
function story(opts: { title: string; body: string; canonical?: string }): string {
  const canonical = opts.canonical ? `<a class="p-canonical" href="${opts.canonical}"></a>` : "";
  return `<!DOCTYPE html><html><head><title>${opts.title}</title>${canonical}</head>
<body><article>
  <header><h1 class="p-name">${opts.title}</h1></header>
  <section data-field="body" class="e-content">${opts.body}</section>
  <footer>${canonical}</footer>
</article></body></html>`;
}

describe("parseMedium", () => {
  it("extracts title, body, canonical, slug and draft status from each story", async () => {
    const zip = makeZip({
      "posts/2024-01-05_My-Great-Post-abc123def456.html": story({
        title: "My Great Post",
        body: "<p>Hello world.</p><figure class=\"graf--figure\"><img src=\"https://cdn.medium.com/x.jpg\"/></figure>",
        canonical: "https://medium.com/@me/my-great-post-abc123def456",
      }),
      "posts/draft_Unfinished-Thoughts-000111.html": story({
        title: "Unfinished Thoughts",
        body: "<p>A rough draft.</p>",
      }),
    });

    const result = await parseMedium(zip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data!.posts).toHaveLength(2);

    const published = result.data!.posts.find((p) => p.status === "published")!;
    expect(published.title).toBe("My Great Post");
    expect(published.slug).toBe("my-great-post");
    expect(published.canonicalUrl).toBe("https://medium.com/@me/my-great-post-abc123def456");
    // Body is the inner html of section[data-field="body"], not the whole file.
    expect(published.html).toContain("Hello world.");
    expect(published.html).not.toContain("<title>");
    expect(published.html).not.toContain("p-name");

    const draft = result.data!.posts.find((p) => p.status === "draft")!;
    expect(draft.title).toBe("Unfinished Thoughts");
    expect(draft.slug).toBe("unfinished-thoughts");
    expect(draft.html).toContain("rough draft");
  });

  it("falls back to the filename when a story has no p-name title", async () => {
    const zip = makeZip({
      "posts/2024-02-02_Bare-Story-deadbeef.html": "<html><body><section data-field=\"body\"><p>No header here.</p></section></body></html>",
    });
    const result = await parseMedium(zip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.posts).toHaveLength(1);
    // Title derived from filename; slug drops the date prefix + trailing hash.
    expect(result.data!.posts[0]!.slug).toBe("bare-story");
    expect(result.data!.posts[0]!.status).toBe("published");
  });

  it("rejects a zip with no posts/*.html files", async () => {
    const zip = makeZip({ "profile/about.html": "<p>bio</p>", "readme.txt": "nope" });
    const result = await parseMedium(zip);
    expect(result.ok).toBe(false);
  });
});
