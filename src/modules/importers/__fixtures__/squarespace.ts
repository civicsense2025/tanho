/**
 * A realistic Squarespace export (Settings → Import & Export → Export →
 * WordPress). Squarespace emits a WordPress-compatible WXR envelope, but the
 * `content:encoded` bodies carry Squarespace's own block markup:
 *   - `<div class="sqs-block sqs-block-image">…<img data-src="…squarespace-cdn.com/…?format=1000w" src="data:image/gif;base64,…placeholder">`
 *   - `<div class="sqs-gallery">…` with multiple lazy `data-src` images
 *   - `<div class="sqs-block html-block">` for raw HTML/embeds
 * The image URLs live on `data-src` (the real CDN URL, with a `?format=` size
 * query), while `src` is a base64 placeholder the detector must reject.
 *
 * Coverage: 2 posts + 1 page; a captioned SQSP image, a 2-image SQSP gallery,
 * a code/html block, categories/tags, AND a post whose image is only a `data:`
 * placeholder (no real data-src) to prove the placeholder is rejected.
 */

const DATA_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const POST_ONE_BODY = `
<div class="sqs-block sqs-block-image" data-block-type="5">
  <div class="sqs-block-content">
    <figure class="image-block-outer-wrapper">
      <img data-src="https://images.squarespace-cdn.com/content/v1/abc/hero.jpg?format=2500w" src="${DATA_PLACEHOLDER}" alt="Studio overview" data-image-dimensions="2500x1667"/>
      <figcaption class="image-caption-wrapper"><p>Our studio, first light.</p></figcaption>
    </figure>
  </div>
</div>
<div class="sqs-block sqs-block-gallery" data-block-type="105">
  <div class="sqs-block-content">
    <div class="sqs-gallery sqs-gallery-design-grid">
      <img data-src="https://images.squarespace-cdn.com/content/v1/abc/g1.jpg?format=1000w" src="${DATA_PLACEHOLDER}" alt="Gallery one"/>
      <img data-src="https://images.squarespace-cdn.com/content/v1/abc/g2.jpg?format=1000w" src="${DATA_PLACEHOLDER}" alt="Gallery two"/>
    </div>
  </div>
</div>
<div class="sqs-block html-block" data-block-type="2"><div class="sqs-block-content"><p>Come visit us downtown.</p></div></div>`;

const POST_TWO_BODY = `
<div class="sqs-block html-block" data-block-type="2"><div class="sqs-block-content"><h2>Our approach</h2><p>We design in the open.</p></div></div>
<div class="sqs-block code-block" data-block-type="23"><div class="sqs-block-content"><pre><code>npm install our-thing</code></pre></div></div>`;

// A post whose only image is the lazy placeholder with NO real data-src — the
// detector must NOT emit an image block pointing at the data: URI.
const POST_THREE_BODY = `
<div class="sqs-block sqs-block-image" data-block-type="5"><div class="sqs-block-content">
  <figure class="image-block-outer-wrapper"><img src="${DATA_PLACEHOLDER}" alt="Broken lazy image"/></figure>
</div></div>
<div class="sqs-block html-block"><div class="sqs-block-content"><p>Body still imports fine.</p></div></div>`;

export function squarespaceWxr(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>Studio Northlight</title>
  <link>https://studio-northlight.squarespace.com</link>
  <description>A small design studio</description>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>https://studio-northlight.squarespace.com</wp:base_site_url>
  <wp:author>
    <wp:author_id>1</wp:author_id>
    <wp:author_login><![CDATA[northlight]]></wp:author_login>
    <wp:author_email><![CDATA[hello@studio-northlight.com]]></wp:author_email>
    <wp:author_display_name><![CDATA[Studio Northlight]]></wp:author_display_name>
  </wp:author>

  <item>
    <title>First Light in the New Studio</title>
    <link>https://studio-northlight.squarespace.com/blog/first-light</link>
    <pubDate>Mon, 04 Mar 2024 08:00:00 +0000</pubDate>
    <dc:creator><![CDATA[northlight]]></dc:creator>
    <guid isPermaLink="false">https://studio-northlight.squarespace.com/blog/first-light</guid>
    <content:encoded><![CDATA[${POST_ONE_BODY}]]></content:encoded>
    <wp:post_id>1</wp:post_id>
    <wp:post_date><![CDATA[2024-03-04 08:00:00]]></wp:post_date>
    <wp:post_name><![CDATA[first-light]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <category domain="category" nicename="studio"><![CDATA[Studio]]></category>
    <category domain="post_tag" nicename="behind-the-scenes"><![CDATA[Behind the Scenes]]></category>
  </item>

  <item>
    <title>How We Work</title>
    <link>https://studio-northlight.squarespace.com/blog/how-we-work</link>
    <pubDate>Mon, 11 Mar 2024 08:00:00 +0000</pubDate>
    <dc:creator><![CDATA[northlight]]></dc:creator>
    <guid isPermaLink="false">https://studio-northlight.squarespace.com/blog/how-we-work</guid>
    <content:encoded><![CDATA[${POST_TWO_BODY}]]></content:encoded>
    <wp:post_id>2</wp:post_id>
    <wp:post_name><![CDATA[how-we-work]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
  </item>

  <item>
    <title>Contact</title>
    <link>https://studio-northlight.squarespace.com/contact</link>
    <dc:creator><![CDATA[northlight]]></dc:creator>
    <guid isPermaLink="false">https://studio-northlight.squarespace.com/contact</guid>
    <content:encoded><![CDATA[${POST_THREE_BODY}]]></content:encoded>
    <wp:post_id>3</wp:post_id>
    <wp:post_name><![CDATA[contact]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[page]]></wp:post_type>
  </item>
</channel>
</rss>`;
}
