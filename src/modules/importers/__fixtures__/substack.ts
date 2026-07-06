import { zipFile, zipBytes } from "./zip";

/**
 * A realistic Substack export (Settings → Exports → "Create a new export").
 *
 * Real layout: one HTML file per post at `posts/<postId>.<slug>.html`, a
 * `posts.csv` keyed by `post_id` (columns `post_id,title,subtitle,post_date,
 * is_published,type,audience`), and an email list at `email_list.csv`
 * (`email,name,active_subscription,...`). Post bodies carry the Substack editor
 * class hooks the detector keys on: `captioned-image-container` figures,
 * `subscribe-widget`, and `a.button`.
 *
 * Coverage: 3 posts (2 published, 1 draft via is_published=false), a captioned
 * image, a subscribe widget, a button; a subscribers CSV with a paid member and
 * a free subscriber; the id.slug filename convention that the parser splits.
 */

const POST_101 = `<div class="body markup">
  <p>Welcome to the newsletter. Here's an image and a way to subscribe.</p>
  <div class="captioned-image-container">
    <figure>
      <a class="image-link" href="https://substackcdn.com/image/full/first.jpg">
        <img src="https://substackcdn.com/image/fetch/w_1456/first.jpg" data-attrs='{"src":"https://substackcdn.com/image/full/first.jpg"}' alt="A first photo"/>
      </a>
      <figcaption class="image-caption">The very first photo.</figcaption>
    </figure>
  </div>
  <p>Thanks for being here.</p>
  <div class="subscribe-widget">
    <div class="preamble"><p class="subscribe-widget__heading">Never miss an issue</p></div>
    <form><button type="submit" class="button">Subscribe</button></form>
  </div>
</div>`;

const POST_102 = `<div class="body markup">
  <p>A shorter note today, with a link button to the archive.</p>
  <p class="button-wrapper" data-attrs='{"url":"https://example.substack.com/archive"}'>
    <a class="button primary" href="https://example.substack.com/archive"><span>Browse the archive</span></a>
  </p>
</div>`;

const POST_103_DRAFT = `<div class="body markup"><p>This one is still a draft — not sent yet.</p></div>`;

const POSTS_CSV = `post_id,title,subtitle,post_date,is_published,type,audience
101,Welcome to the Newsletter,Our first issue,2024-03-05T14:00:00Z,true,newsletter,everyone
102,A Quick Note,,2024-03-12T14:00:00Z,true,newsletter,everyone
103,Draft Ideas,Not ready yet,2024-03-19T14:00:00Z,false,newsletter,only_paid`;

// email_list.csv — a paid subscriber (active_subscription=true) and a free one.
const EMAIL_CSV = `email,name,active_subscription,expiry,created_at
fan@example.com,Loyal Fan,true,2025-03-01,2024-01-10T00:00:00Z
casual@example.com,Casual Reader,false,,2024-02-15T00:00:00Z`;

/** The `{ path → content }` map (also used to write the .zip to disk). */
export function substackFiles(): Record<string, string> {
  return {
    "posts/101.welcome-to-the-newsletter.html": POST_101,
    "posts/102.a-quick-note.html": POST_102,
    "posts/103.draft-ideas.html": POST_103_DRAFT,
    "posts.csv": POSTS_CSV,
    "email_list.csv": EMAIL_CSV,
  };
}

export function substackZip(): File {
  return zipFile(substackFiles(), "substack-export.zip");
}

export function substackZipBytes(): Uint8Array {
  return zipBytes(substackFiles());
}
