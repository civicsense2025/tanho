import { zipFile, zipBytes } from "./zip";

/**
 * A realistic Markdown export — a `.zip` of `*.md` files with YAML frontmatter,
 * the shape you get from a Jekyll `_posts/` folder, a Hugo `content/` tree, or
 * an Obsidian vault. Each file: an optional `---\n…\n---` frontmatter block
 * (title/slug/date/draft/tags, plus Jekyll `redirect_from` / Hugo `aliases`
 * that become 301s), then Markdown body → sanitized HTML → blocks.
 *
 * Coverage: 4 files — a full-frontmatter published post with tags + an
 * `![](…)` image (→ image block) + a fenced code block, a Hugo-style post with
 * `aliases` (→ redirects), a `draft: true` post, a frontmatter-less file (title
 * derived from filename), AND one file with deliberately broken YAML (must
 * surface a `frontmatter-invalid` issue and still import via filename title).
 */

const POST_HELLO = `---
title: Hello, Markdown
slug: hello-markdown
date: 2024-03-07
tags: [writing, tools]
redirect_from:
  - /old/hello/
  - /2024/hello-markdown/
---

# Hello, Markdown

This is a real post written in Markdown, with an image and some code.

An inline markdown image (renders inside a paragraph):

![A landscape](https://cdn.example.com/landscape.jpg "A wide landscape")

A raw HTML figure (Obsidian/Hugo allow inline HTML — becomes a native image block):

<figure><img src="https://cdn.example.com/figure.jpg" alt="A framed figure"/><figcaption>A framed figure.</figcaption></figure>

Here's a snippet:

\`\`\`js
console.log("hello from markdown");
\`\`\`

- first point
- second point
`;

const POST_HUGO = `---
title: "Migrating from Hugo"
date: 2024-03-14T09:00:00-05:00
aliases:
  - /blog/migrating-hugo/
  - /posts/hugo/
tags:
  - migration
  - hugo
---

Moving content from Hugo keeps the **aliases** as redirects.

> A blockquote to prove richtext survives.
`;

const POST_DRAFT = `---
title: A Drafted Idea
draft: true
---

Not ready for the world yet.
`;

const POST_NO_FRONTMATTER = `# A Note Without Frontmatter

The title should come from the filename, and this body still imports fine.
`;

// Deliberately broken YAML frontmatter (unclosed bracket) — the parser must
// record a \`frontmatter-invalid\` issue and fall back to a filename title.
const POST_BAD_YAML = `---
title: [unterminated
tags: oops
---

The body is fine even though the frontmatter is not.
`;

export function markdownFiles(): Record<string, string> {
  return {
    "posts/hello-markdown.md": POST_HELLO,
    "content/migrating-from-hugo.md": POST_HUGO,
    "posts/a-drafted-idea.md": POST_DRAFT,
    "notes/a-note-without-frontmatter.md": POST_NO_FRONTMATTER,
    "posts/broken-frontmatter.md": POST_BAD_YAML,
  };
}

export function markdownZip(): File {
  return zipFile(markdownFiles(), "markdown-export.zip");
}

export function markdownZipBytes(): Uint8Array {
  return zipBytes(markdownFiles());
}
