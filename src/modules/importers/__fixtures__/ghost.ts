/**
 * A realistic Ghost content export (Settings → Migration → Export) + members CSV.
 *
 * Mirrors the real `{ db: [{ meta, data }] }` wrapper Ghost ships, with the five
 * join-table-normalized collections (`posts`, `tags`, `posts_tags`, `users`,
 * `posts_authors`) the importer reads. Post bodies use the real Ghost card
 * markup the detector keys on: `kg-card`/`kg-image-card` figures, a
 * `kg-gallery-card`, a `kg-embed-card`, a `kg-button-card`, and a
 * `kg-bookmark-card`, plus a `<pre><code>` block and a members-only post.
 *
 * Coverage: 6 posts (published/draft/scheduled-as-draft, public/members/paid),
 * an image + caption, a 2-image gallery, a YouTube embed, a button, a code
 * block, tags with multiple authors, a feature image, AND one deliberately
 * malformed post (missing slug) that must surface as an issue, not abort.
 * Members CSV: 4 rows — a paid (complimentary) member, a free subscriber, an
 * unsubscribed member, and a deleted member.
 */

const POST_WELCOME = `<p>Welcome to the blog. This first post shows a captioned image and a gallery.</p>
<figure class="kg-card kg-image-card kg-card-hascaption">
  <img src="https://static.ghost.example/content/images/2024/03/hero.jpg" class="kg-image" alt="A wide mountain vista" loading="lazy" />
  <figcaption>Sunrise over the ridge.</figcaption>
</figure>
<figure class="kg-card kg-gallery-card kg-width-wide">
  <div class="kg-gallery-container">
    <div class="kg-gallery-row">
      <div class="kg-gallery-image"><img src="https://static.ghost.example/content/images/2024/03/g1.jpg" alt="Gallery one" /></div>
      <div class="kg-gallery-image"><img src="https://static.ghost.example/content/images/2024/03/g2.jpg" alt="Gallery two" /></div>
    </div>
  </div>
</figure>
<p>That's the gallery. Thanks for reading.</p>`;

const POST_EMBED = `<p>Here's a video we referenced this week:</p>
<figure class="kg-card kg-embed-card">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
</figure>
<p>And a button to the full write-up:</p>
<div class="kg-card kg-btn-wide">
  <a href="https://example.com/full-writeup" class="kg-btn kg-btn-accent">Read the full write-up</a>
</div>`;

const POST_CODE = `<p>A quick snippet from today's work:</p>
<pre><code class="language-ts">export function add(a: number, b: number): number {
  return a + b;
}</code></pre>
<figure class="kg-card kg-bookmark-card">
  <a class="kg-bookmark-container" href="https://example.com/some-reference">
    <div class="kg-bookmark-content">
      <div class="kg-bookmark-title">A useful reference</div>
      <div class="kg-bookmark-description">Everything you need to know about the thing.</div>
    </div>
  </a>
</figure>`;

const POST_MEMBERS = `<p>This is members-only analysis. Subscribers see the full breakdown below.</p>
<p>Thanks for supporting the work.</p>`;

const POST_DRAFT = `<p>Still writing this one — notes below.</p><ul><li>point one</li><li>point two</li></ul>`;

/** Ghost export JSON (the `{db:[{meta,data}]}` wrapper). Returned as a pretty
 *  string so it can be written to disk verbatim AND parsed by the importer. */
export function ghostExportJson(): string {
  const now = 1_711_929_600_000; // 2024-04-01T00:00:00Z
  const doc = {
    db: [
      {
        meta: { exported_on: now, version: "5.82.0" },
        data: {
          posts: [
            {
              id: "1",
              title: "Welcome to the Blog",
              slug: "welcome-to-the-blog",
              html: POST_WELCOME,
              status: "published",
              visibility: "public",
              feature_image: "https://static.ghost.example/content/images/2024/03/hero.jpg",
              published_at: "2024-03-02T09:00:00.000Z",
              custom_excerpt: "Our very first post, with an image and a gallery.",
            },
            {
              id: "2",
              title: "A Video and a Button",
              slug: "a-video-and-a-button",
              html: POST_EMBED,
              status: "published",
              visibility: "public",
              feature_image: null,
              published_at: "2024-03-09T09:00:00.000Z",
              custom_excerpt: null,
            },
            {
              id: "3",
              title: "Code and Bookmarks",
              slug: "code-and-bookmarks",
              html: POST_CODE,
              status: "published",
              visibility: "public",
              feature_image: null,
              published_at: "2024-03-16T09:00:00.000Z",
              custom_excerpt: null,
            },
            {
              id: "4",
              title: "Members-Only Deep Dive",
              slug: "members-only-deep-dive",
              html: POST_MEMBERS,
              status: "published",
              visibility: "paid",
              feature_image: null,
              published_at: "2024-03-23T09:00:00.000Z",
              custom_excerpt: "For paying members.",
            },
            {
              id: "5",
              title: "An Unfinished Draft",
              slug: "an-unfinished-draft",
              html: POST_DRAFT,
              status: "draft",
              visibility: "members",
              feature_image: null,
              published_at: null,
              custom_excerpt: null,
            },
            // Deliberately malformed: no `slug`. The parser must record an issue
            // ("missing id/title/slug") and skip it — never abort the import.
            {
              id: "6",
              title: "Broken Post With No Slug",
              html: "<p>This should be skipped with an issue.</p>",
              status: "published",
              visibility: "public",
            },
          ],
          tags: [
            { id: "t1", name: "Announcements", slug: "announcements" },
            { id: "t2", name: "Engineering", slug: "engineering" },
          ],
          posts_tags: [
            { post_id: "1", tag_id: "t1" },
            { post_id: "3", tag_id: "t2" },
          ],
          users: [
            { id: "u1", name: "Ada Lovelace", slug: "ada", email: "ada@example.com" },
            { id: "u2", name: "Alan Turing", slug: "alan", email: "alan@example.com" },
          ],
          posts_authors: [
            { post_id: "1", author_id: "u1" },
            { post_id: "2", author_id: "u2" },
            { post_id: "3", author_id: "u1" },
          ],
        },
      },
    ],
  };
  return JSON.stringify(doc, null, 2);
}

/** Ghost Members CSV export (Members → Export). Real column order + types. */
export function ghostMembersCsv(): string {
  const header = "id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at";
  const rows = [
    // A paying (complimentary) member.
    `m1,supporter@example.com,Grace Hopper,"VIP, early backer",true,true,cus_ABC123,2024-01-15T10:00:00.000Z,`,
    // A free subscriber.
    `m2,reader@example.com,Katherine Johnson,,true,false,,2024-02-01T12:30:00.000Z,`,
    // Unsubscribed (still a person, not emailed).
    `m3,quiet@example.com,Dorothy Vaughan,unsubscribed at their request,false,false,,2024-02-10T08:00:00.000Z,`,
    // Deleted member — should be skipped/handled by the importer.
    `m4,gone@example.com,Removed Member,,false,false,,2024-01-20T09:00:00.000Z,2024-03-01T00:00:00.000Z`,
  ];
  return [header, ...rows].join("\n") + "\n";
}
