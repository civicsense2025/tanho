import { zipFile, zipBytes } from "./zip";

/**
 * A realistic Medium export (Settings → Download your information → the `posts/`
 * folder). Real layout: one HTML file per story at
 * `posts/YYYY-MM-DD_Title-Slug-<hash>.html` (drafts prefixed `draft_`). Each
 * file is a full Medium article page: the title in `<h1 class="p-name">`, the
 * body in `<section data-field="body">`, and the public URL in
 * `<a class="p-canonical">`. Bodies carry Medium's `graf--*` classes the
 * detector keys on: `figure.graf--figure`, `.graf--pullquote`, and
 * `.graf--mixtapeEmbed` / a `<figure>` with an `<iframe>`.
 *
 * Coverage: 3 stories (2 published, 1 draft via `draft_` prefix), an image with
 * caption, a pull quote, an embed, and a canonical URL used to build the 301 —
 * plus the trailing "-<hash>" the parser strips from slugs.
 */

function mediumPage(opts: { title: string; canonical?: string; body: string; subtitle?: string }): string {
  const canonicalLink = opts.canonical ? `<a class="p-canonical" href="${opts.canonical}"></a>` : "";
  const sub = opts.subtitle ? `<p class="p-summary" data-field="subtitle">${opts.subtitle}</p>` : "";
  return `<!DOCTYPE html>
<html>
<head><title>${opts.title}</title></head>
<body>
  <article class="h-entry">
    <header>
      <h1 class="p-name">${opts.title}</h1>
      ${sub}
    </header>
    <section data-field="body" class="e-content">
${opts.body}
    </section>
    <footer>${canonicalLink}</footer>
  </article>
</body>
</html>`;
}

// Real Medium exports place graf--* elements as DIRECT children of
// section[data-field="body"] (no inner wrapper), so each is a top-level element
// the card detector inspects individually. parseMedium extracts the section's
// innerHTML, so what matters is that these are a flat sequence.
const BODY_ONE = `<p class="graf graf--p">This is my first story on Medium. Below is a figure and a pull quote.</p>
      <figure class="graf graf--figure">
        <img class="graf-image" data-image-id="1*abc.png" src="https://cdn-images-1.medium.com/max/1600/1*abc.png" alt="A diagram"/>
        <figcaption class="imageCaption">A diagram explaining the idea.</figcaption>
      </figure>
      <blockquote class="graf graf--pullquote">The best way to predict the future is to invent it.</blockquote>
      <p class="graf graf--p">Thanks for reading.</p>`;

const BODY_TWO = `<p class="graf graf--p">A story with an embedded video.</p>
      <figure class="graf graf--figure graf--iframe graf--mixtapeEmbed">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
      </figure>
      <p class="graf graf--p">Pretty neat, right?</p>`;

const BODY_DRAFT = `<p class="graf graf--p">Half-finished thoughts that never shipped.</p>`;

export function mediumFiles(): Record<string, string> {
  return {
    "posts/2024-03-06_My-First-Story-on-Medium-1a2b3c4d5e6f.html": mediumPage({
      title: "My First Story on Medium",
      subtitle: "Getting started",
      canonical: "https://medium.com/@writer/my-first-story-on-medium-1a2b3c4d5e6f",
      body: BODY_ONE,
    }),
    "posts/2024-03-13_Embedding-Video-9f8e7d6c5b4a.html": mediumPage({
      title: "Embedding Video",
      canonical: "https://medium.com/@writer/embedding-video-9f8e7d6c5b4a",
      body: BODY_TWO,
    }),
    // draft_ prefix → status draft; no canonical (unpublished stories have none).
    "posts/draft_Unfinished-Thoughts-abcdef123456.html": mediumPage({
      title: "Unfinished Thoughts",
      body: BODY_DRAFT,
    }),
  };
}

export function mediumZip(): File {
  return zipFile(mediumFiles(), "medium-export.zip");
}

export function mediumZipBytes(): Uint8Array {
  return zipBytes(mediumFiles());
}
